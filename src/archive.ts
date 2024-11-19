import fs from 'fs-extra';
import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';

import { handleAllCssFiles } from './css';
import { generateIndex } from './generateIndex';
import { exportHTML } from './html';
import { logger } from './logger';
import { login } from './login';
import { onPageResponse } from './ressources';
import { autoScroll } from './scroll';
import { sleep } from './sleep';
import { getVillageCount, selectVillage } from './village';

const SELECTORS = {
  PHASE_BUTTONS: '#__next > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(1) > div > div:nth-child',
  WORLD_MAP: '#__next > div > div:nth-child(3) > div:nth-child(2) > div.app-content__card.with-shadow > div:nth-child(1)',
  MOBILE_VIEW: '#__next > div > div:nth-child(2)',
};

const PHASES = [1, 2, 3];
/**
 * Récupère l'URL de l'archive. Ajoute le paramètre nopagination pour éviter la pagination.
 * @param baseUrl
 * @param pathName
 */
async function getArchiveUrl(baseUrl: string, pathName: string = ''): Promise<string> {
  const url = new URL(`${baseUrl}/${pathName}`);
  url.searchParams.append('nopagination', 'true');
  logger.info(`generated archive url: ${url.toString()}`)
  return url.toString();
}

async function gotoWithRetry(page: Page, url: string, maxAttempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      logger.info(`Navigation attempt ${attempt} failed, retrying in 30 seconds...`);
      await sleep(30000); 
    }
  }
}

async function clickWithRetry(page: Page, url: string, maxAttempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.click(url);
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      logger.info(`Click attempt ${attempt} failed, retrying in 30 seconds...`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(30000);
    }
  }
}

/**
 * Archive une page spécifique du site web.
 * @param dirPath - Chemin du répertoire où les fichiers archivés seront sauvegardés.
 * @param page - L'objet Page de Puppeteer.
 * @param ressources - Un objet contenant les ressources à archiver.
 * @param villageName - Le nom du village en cours d'archivage.
 * @param phase - La phase actuelle de l'archivage.
 */
async function archivePage(dirPath: string, page: Page, ressources: Record<string, string>, villageName: string, phase: number) {
  const index = `index-${villageName
    .toLowerCase()
    .replace(/\s/gim, '-')
    .replace(/[–|-]+/gim, '-')}-phase-${phase}`;
  const visitedPages: Record<string, boolean> = {};

  const visit = async (pathName: string = ''): Promise<void> => {
    if (visitedPages[pathName]) {
      return;
    }
    visitedPages[pathName] = true;
    logger.info(`Archiving ${villageName}, phase ${phase}, page: "/${pathName}"`);
    await sleep(2000);
    const archiveUrl = await getArchiveUrl(process.env.URL_TO_ARCHIVE || '', pathName);
    await gotoWithRetry(page, archiveUrl);
    /**
     * Gère la navigation entre les différentes phases d'un village.
     * Ce bloc est exécuté uniquement pour la page d'accueil de chaque phase.
     *
     * @param pathName - Le chemin de la page actuelle (vide pour la page d'accueil).
     * @param phase - La phase actuelle (1, 2 ou 3).
     */
    if (pathName === '' && phase >= 1 && phase <= 3) {
      await sleep(4000);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await clickWithRetry(page, `${SELECTORS.PHASE_BUTTONS}(${phase})`);
      await sleep(500);
    }
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
    try {
      await page.evaluate(({SELECTORS}) => {
        const $map = document.querySelector(SELECTORS.WORLD_MAP);
        if (!$map) {
          return;
        }
        $map.parentNode?.removeChild($map);
      }, {SELECTORS});
    } catch (err) {
      logger.error(err);
    }

    // Update index phase buttons
    try {
      await page.evaluate(({villageName, SELECTORS, PHASES}) => {
        PHASES.forEach((phase) => {
          const buttonSelector = `${SELECTORS.PHASE_BUTTONS}(${phase})`;
          const $button = document.querySelector(buttonSelector);
          if (!$button) {
            return;
          }
          const newButton = document.createElement('a');
          newButton.setAttribute('style', $button.getAttribute('style') || '');
          newButton.setAttribute(
            'href',
            `/index-${villageName
              .toLowerCase()
              .replace(/\s/gim, '-')
              .replace(/[–|-]+/gim, '-')}-phase-${phase}`,
          );
          newButton.innerHTML = $button.innerHTML;
          $button.parentNode?.replaceChild(newButton, $button);
        });
      }, {villageName, SELECTORS, PHASES});
    } catch (e) {
      logger.error(`Error updating index phase buttons: ${e}`);
    }
    
    // Remove mobile view
    try {
      await page.evaluate(({SELECTORS}) => {
        const $mobile = document.querySelector(SELECTORS.MOBILE_VIEW);
        if ($mobile) {
          $mobile.parentNode?.removeChild($mobile);
        }
      }, {SELECTORS});
    } catch (err) {
      logger.error(`Error removing mobile view:${err}`);
    }

    // Save page
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    if (html === '<html><head><style></style></head><body>Too many requests, please try again later.</body></html>') {
      logger.info(`Too many requests for "/${pathName}". Retrying after delay...`);
      visitedPages[pathName] = false; // Reset pour permettre une nouvelle tentative
      await sleep(5000);
      return visit(pathName);
    }
    const nextPaths = await exportHTML(dirPath, pathName, html, ressources, index);
    logger.info("End");
    for (const nextPath of nextPaths) {
      await visit(nextPath);
    }
  };

  await visit();
  logger.success(`${villageName} archived.`);
}

/**
 * Fonction principale pour archiver l'ensemble du site web 1Village.
 * Cette fonction initialise le navigateur, se connecte, et archive chaque village et phase.
 */
export async function archiveWebsite() {
  process.env.NEXT_PUBLIC_ARCHIVE_MODE = 'true';
  logger.infoBold('======= Archiving 1Village =======');
  logger.info(`==> YEAR : ${process.env.YEAR ?? ''}`);
  logger.info(`==> URL_TO_ARCHIVE : ${process.env.URL_TO_ARCHIVE ?? ''}`);

  let resources: Record<string, string> = {};
  try {
    try {
      const savedResources = await fs.readFile('resources.json', 'utf-8');
      resources = JSON.parse(savedResources || '{}') || {};
    } catch (e) {
      logger.error(e);
    }
    const browser = await puppeteer.launch({
      headless: true,
      args: [`--window-size=1440,2000`],
      defaultViewport: {
        width: 1440,
        height: 2000,
      },
    });
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const year = process.env.YEAR ?? '';
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

    const villages: string[] = [];
    for (let i = 0; i < villageCount; i++) {
      const villageName = await selectVillage(page, i + 1);
      if (villageName == '') {
        logger.success(`An error occurred when selecting a village !`);
        continue
      }
      logger.info(villageName);
      villages.push(villageName);
      for (const phase of PHASES) {
        await sleep(20000);
        await archivePage(dirPath, page, resources, villageName, phase)
      }
      logger.info(`Village ${villageName} fully archived`);
    }

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
