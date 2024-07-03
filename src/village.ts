import type { Page } from 'puppeteer';

import { logger } from './logger';
import { sleep } from './sleep';

const SELECTORS = {
  VILLAGE_BUTTON: '#__next > div > header > div.with-shadow > div.header__user > div:nth-child(1) > div > div > button',
  VILLAGE_SELECT: '#select-village',
  VILLAGE_OPTION: 'li[role="option"]',
  CONFIRM_BUTTON: 'div.MuiDialog-root button.MuiButton-containedSecondary',
};

/**
 * Obtient le nombre de villages disponibles sur le site.
 * @param page - L'objet Page de Puppeteer.
 * @returns Le nombre de villages.
 * @throws {Error} Si une erreur survient pendant la récupération du nombre de villages.
 */
export async function getVillageCount(page: Page): Promise<number> {
  logger.info('Getting villages');

  try {
    await page.goto(`${process.env.URL_TO_ARCHIVE}`, { waitUntil: 'networkidle0' });
    await sleep(500);
    await page.click(SELECTORS.VILLAGE_BUTTON);
    await page.waitForSelector(SELECTORS.VILLAGE_SELECT, { timeout: 5000 });
    await page.click(SELECTORS.VILLAGE_SELECT);
    await page.waitForSelector(SELECTORS.VILLAGE_OPTION, { timeout: 5000 });
    const count = await page.evaluate(({SELECTORS}) => {
      return document.querySelectorAll(SELECTORS.VILLAGE_OPTION).length;
    }, {SELECTORS});
    // logger.stopLoading();
    return count;
  } catch (e) {
    // logger.stopLoading();
    logger.info(e);
    return 0;
  }
}

async function waitForSelectorWithRetry(page: Page, selector: string, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout: 60000 });
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      logger.info(`Attempt ${attempt} failed, retrying...`);
      await sleep(60000); 
    }
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
    await page.goto(`${process.env.URL_TO_ARCHIVE}`, { waitUntil: 'networkidle0' });
    await sleep(2000);

    // Vérifier et cliquer sur le bouton pour ouvrir le menu déroulant
    const buttonSelector = SELECTORS.VILLAGE_BUTTON;
    await page.waitForSelector(buttonSelector, { visible: true, timeout: 30000 });
    await page.click(buttonSelector);
    await sleep(10000);
    
    // Attendre que le menu déroulant apparaisse avec retry
    await waitForSelectorWithRetry(page, SELECTORS.VILLAGE_SELECT);
    await page.click(SELECTORS.VILLAGE_SELECT);
    
    const selector = `${SELECTORS.VILLAGE_OPTION}:nth-child(${index})`;
    await page.waitForSelector(selector, { timeout: 5000 });
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
