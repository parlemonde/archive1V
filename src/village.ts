import type { Page } from 'puppeteer';

import { logger } from './logger';
import { sleep } from './sleep';

export async function getVillageCount(page: Page): Promise<number> {
  logger.startLoading('Getting villages');

  try {
    await page.goto(`https://1v.parlemonde.org`, { waitUntil: 'networkidle0' });
    await sleep(500);
    await page.click('#__next > div > header > div > div > div:nth-child(1) > button');
    await page.waitForSelector('#select-village', { timeout: 5000 });
    await page.click('#select-village');
    await page.waitForSelector(`li[role="option"]`, { timeout: 5000 });
    const count = await page.evaluate(() => document.querySelectorAll(`li[role="option"]`).length);
    logger.stopLoading();
    return count;
  } catch (e) {
    logger.stopLoading();
    logger.error(e);
    return 0;
  }
}

export async function selectVillage(page: Page, index: number) {
  logger.startLoading('Selecting village');

  try {
    await page.goto(`https://1v.parlemonde.org`, { waitUntil: 'networkidle0' });
    await sleep(500);
    await page.click('#__next > div > header > div > div > div:nth-child(1) > button');
    await sleep(500);
    await page.waitForSelector('#select-village', { timeout: 5000 });
    await page.click('#select-village');
    const selector = `li[role="option"]:nth-child(${index})`;
    await page.waitForSelector(selector, { timeout: 5000 });
    const village = await page.evaluate((i: number) => {
      const $el = document.querySelector(`li[role="option"]:nth-child(${i})`);
      if ($el) {
        return {
          id: Number($el.getAttribute('data-value')),
          name: ($el as HTMLLIElement).innerText,
        };
      }
      return null;
    }, index);
    if (!village) {
      throw new Error('Village not found...');
    }
    await page.click(`li[role="option"]:nth-child(${index})`);
    await sleep(500);
    await page.click('div.MuiDialog-root button.MuiButton-containedSecondary');
    await sleep(500);
    logger.stopLoading();
    return village.name;
  } catch (e) {
    logger.stopLoading();
    logger.error(e);
    return '';
  }
}
