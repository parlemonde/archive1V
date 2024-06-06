import fs from 'fs-extra';
import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';

import { handleAllCssFiles } from './css';
import { generateIndex, promptYear } from './generateIndex';
import { exportHTML } from './html';
import { logger } from './logger';
import { login } from './login';
import { onPageResponse } from './ressources';
import { autoScroll } from './scroll';
import { sleep } from './sleep';
import { getVillageCount, selectVillage } from './village';

async function archivePage(dirPath: string, page: Page, ressources: Record<string, string>, villageName: string, phase: number) {
  const index = `index-${villageName
    .toLowerCase()
    .replace(/\s/gim, '-')
    .replace(/[–|-]+/gim, '-')}-phase-${phase + 1}`;
  const visitedPages: Record<string, boolean> = {};

  const visit = async (pathName: string = '') => {
    if (visitedPages[pathName]) {
      return;
    }
    visitedPages[pathName] = true;
    logger.startLoading(`Archiving ${villageName}, phase ${phase}, page: "/${pathName}"`);
    await sleep(2000);
    await page.goto(`https://1v.parlemonde.org/${pathName}`, { waitUntil: 'networkidle0' });
    if (pathName === '' && phase === 0) {
      await sleep(4000);
      await page.reload({ waitUntil: 'networkidle0' });
      await page.click('#__next > div > main > div > div.app-content__sub-header > div > div:nth-child(1)');
      await sleep(500);
    }
    if (pathName === '' && phase === 1) {
      await sleep(4000);
      await page.reload({ waitUntil: 'networkidle0' });
      await page.click('#__next > div > main > div > div.app-content__sub-header > div > div:nth-child(2)');
      await sleep(500);
    } // index for phase 2
    if (pathName === '' && phase === 2) {
      await sleep(4000);
      await page.reload({ waitUntil: 'networkidle0' });
      await page.click('#__next > div > main > div > div.app-content__sub-header > div > div:nth-child(3)');
      await sleep(500);
    } // index for phase 3
    await autoScroll(page);

    // Fix missing CSS rules.
    await page.evaluate(() => {
      const stylesheets = [...document.styleSheets];
      const css = stylesheets.map((stylesheet) => [...stylesheet.cssRules].map((rule) => rule.cssText).join('')).join('');
      const $style = document.createElement('style');
      $style.innerText = css;
      document.head.appendChild($style);
    });

    // Remove world map
    await page.evaluate(() => {
      try {
        const $map = document.querySelector('#__next > div > main > div > div.app-content__card.with-shadow > div:nth-child(1)');
        if (!$map) {
          return;
        }
        $map.parentNode?.removeChild($map);
      } catch (err) {
        //
      }
    });

    // Update index phase buttons
    await page.evaluate((villageName) => {
      try {
        for (let i = 1; i < 4; i++) {
          const path = `#__next > div > main > div > div.app-content__sub-header > div > div:nth-child(${i})`;
          const $button = document.querySelector(path);
          if (!$button) {
            continue;
          }
          const newButton = document.createElement('a');
          newButton.setAttribute('style', $button.getAttribute('style') || '');
          newButton.setAttribute(
            'href',
            `/index-${villageName
              .toLowerCase()
              .replace(/\s/gim, '-')
              .replace(/[–|-]+/gim, '-')}-phase-${i}`,
          );
          newButton.innerHTML = $button.innerHTML;
          $button.parentNode?.replaceChild(newButton, $button);
        }
      } catch (e) {
        //
      }
    }, villageName);

    // Save page
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    if (html === '<html><head><style></style></head><body>Too many requests, please try again later.</body></html>') {
      await sleep(5000);
      visit(pathName);
      return;
    }
    const nextPaths = await exportHTML(dirPath, pathName, html, ressources, index);
    logger.stopLoading();
    for (const nextPath of nextPaths) {
      await visit(nextPath);
    }
  };

  await visit();
  logger.success(`${villageName} archived.`);
}

export async function archiveWebsite() {
  logger.infoBold('======= Archiving 1Village =======');
  let resources: Record<string, string> = {};
  try {
    try {
      const savedResources = await fs.readFile('resources.json', 'utf-8');
      resources = JSON.parse(savedResources || '{}') || {};
    } catch (e) {
      logger.error(e);
    }
    const browser = await puppeteer.launch({
      headless: false,
      args: [`--window-size=1440,2000`],
      defaultViewport: {
        width: 1440,
        height: 2000,
      },
    });
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const year = await promptYear(); // '2022-2023'
    const dirPath = `archive/api/archives/${year.replace(/\//gim, '-')}`;
    await fs.ensureDir(dirPath);
    await fs.ensureDir(`${dirPath}/ressources`);
    await fs.ensureDir(`${dirPath}/activite`);

    await login(page);
    const villageCount = await getVillageCount(page);
    if (villageCount === 0) {
      logger.warn('No village found... exiting.');
      await browser.close();
      return;
    }

    page.on('response', onPageResponse(dirPath, resources));

    // --- If you want to archive a specific village because the auto list loop is not working. ---
    // const villageName = 'Village monde Belgique – Russie';
    // await page.setCookie({ name: 'village-id', value: '6', domain: '1v.parlemonde.org' });
    // await archivePage(dirPath, page, ressources, villageName, 0);
    // await archivePage(dirPath, page, ressources, villageName, 1);
    // await archivePage(dirPath, page, ressources, villageName, 2);

    const villages: string[] = [];
    for (let i = 0; i < villageCount; i++) {
      const villageName = await selectVillage(page, i + 1);
      villages.push(villageName);
      await sleep(20000);
      await archivePage(dirPath, page, resources, villageName, 0);
      await sleep(20000);
      await archivePage(dirPath, page, resources, villageName, 1);
      await sleep(20000);
      await archivePage(dirPath, page, resources, villageName, 2);
    }

    // --- If some villages have already been archived, we can skip them and add them by hand. ---
    // const villages = [
    //   'Village monde France - Albanie',
    //   'Village monde France - Canada',
    //   'Village monde France - Liban',
    //   'Village monde France - Espagne',
    //   'Village monde France - Maroc',
    //   'Village monde France - Roumanie',
    //   'Village monde Rwanda - Tunisie',
    //   'Village monde France - Serbie',
    //   'Village monde Égypte - Géorgie',
    //   'Village monde Djibouti - Grèce',
    // ];

    await handleAllCssFiles(resources, dirPath);
    await generateIndex(villages, year, dirPath);
    await browser.close();
    logger.success(`Done!`);
  } catch (e) {
    logger.error(e);
  } finally {
    await fs.writeFile('resources.json', JSON.stringify(resources));
  }
}
