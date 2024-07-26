import type { Page } from 'puppeteer';

import { logger } from './logger';
import { sleep } from './sleep';

const SELECTORS = {
  VILLAGE_BUTTON: '#__next > div > header > div.with-shadow > div.header__user > div:nth-child(1) > div > div > button',
  VILLAGE_SELECT: '#select-village',
  VILLAGE_OPTION: 'li[role="option"]',
  CONFIRM_BUTTON: 'div.MuiDialog-root button.MuiButton-containedSecondary',
};

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


async function waitForSelectorWithRetry(page: Page, selector: string, maxAttempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 60000 });
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      logger.info(`Selector ${selector} not found on attempt ${attempt}, retrying...`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(30000);
    }
  }
}


/**
 * Obtient le nombre de villages disponibles sur le site.
 * @param page - L'objet Page de Puppeteer.
 * @returns Le nombre de villages.
 * @throws {Error} Si une erreur survient pendant la récupération du nombre de villages.
 */
export async function getVillageCount(page: Page): Promise<number> {
  logger.info('Getting villages');

  try {
    await gotoWithRetry(page, `${process.env.URL_TO_ARCHIVE}`);
    await sleep(5000);  // Wait for any potential post-load scripts

    // Wait for and click the village button
    await waitForSelectorWithRetry(page, SELECTORS.VILLAGE_BUTTON);
    await page.click(SELECTORS.VILLAGE_BUTTON);

    // Wait for and click the village select
    await waitForSelectorWithRetry(page, SELECTORS.VILLAGE_SELECT);
    await page.click(SELECTORS.VILLAGE_SELECT);

    // Wait for village options to appear
    await waitForSelectorWithRetry(page, SELECTORS.VILLAGE_OPTION);

    // Count the villages
    const count = await page.evaluate(({SELECTORS}) => {
      return document.querySelectorAll(SELECTORS.VILLAGE_OPTION).length;
    }, {SELECTORS});
    logger.info(`Found ${count} villages`);
    return count;
  } catch (e) {
    logger.info(`Error getting village count: ${e}`);
    return 0;
  }
}


/**
 * Sélectionne un village spécifique sur le site.
 * @param page - L'objet Page de Puppeteer.
 * @param index - L'index du village à sélectionner.
 * @returns Le nom du village sélectionné.
 * @throws {Error} Si une erreur survient pendant la sélection du village.
 */
export async function selectVillage(page: Page, index: number) {
  logger.info('Selecting village');

  try {
    // await page.goto(`${process.env.URL_TO_ARCHIVE}`, { waitUntil: 'domcontentloaded' });
    await gotoWithRetry(page, `${process.env.URL_TO_ARCHIVE}`);
    await sleep(2000);

    // Vérifier et cliquer sur le bouton pour ouvrir le menu déroulant
    const buttonSelector = SELECTORS.VILLAGE_BUTTON;
    await waitForSelectorWithRetry(page, buttonSelector);
    await page.click(buttonSelector);
    await sleep(10000);
    
    // Attendre que le menu déroulant apparaisse avec retry
    await waitForSelectorWithRetry(page, SELECTORS.VILLAGE_SELECT);
    await page.click(SELECTORS.VILLAGE_SELECT);
    
    const selector = `${SELECTORS.VILLAGE_OPTION}:nth-child(${index})`;
    await waitForSelectorWithRetry(page, selector);
    const village = await page.evaluate(({index, SELECTORS}) => {
      const $el = document.querySelector(`${SELECTORS.VILLAGE_OPTION}:nth-child(${index})`);
      if ($el) {
        return {
          id: Number($el.getAttribute('data-value')),
          name: ($el as HTMLLIElement).innerText,
        };
      }
      return null;
    }, {index, SELECTORS});
    if (!village) {
      throw new Error('Village not found...');
    }
    await page.click(`${SELECTORS.VILLAGE_OPTION}:nth-child(${index})`);
    await sleep(500);
    await page.click(SELECTORS.CONFIRM_BUTTON);
    await sleep(500);
    // logger.stopLoading();
    return village.name;
  } catch (e) {
    // logger.stopLoading();
    logger.error(e);
    return '';
  }
}
