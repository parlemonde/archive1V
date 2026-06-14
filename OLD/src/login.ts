import type { Page } from 'puppeteer';

import { logger } from './logger';

/**
 * Se connecte au site web en utilisant un access-token.
 * @param page - L'objet Page de Puppeteer.
 * @throws {Error} Si une erreur survient pendant la connexion.
 */
async function loginWithAccessToken(page: Page) {
  try {
    logger.startLoading('Logging in');
    await page.setCookie({ name: 'access-token', value: process.env.ACCESS_TOKEN || '', domain: `${process.env.URL_TO_ARCHIVE}` });
    await page.goto(`${process.env.URL_TO_ARCHIVE}`, { waitUntil: 'networkidle0' });
    logger.stopLoading();
    logger.success('Logged in!');
  } catch (e) {
    logger.error(e);
  }
}

/**
 * Se connecte au site web en utilisant les identifiants ou un jeton d'accès.
 * @param page - L'objet Page de Puppeteer.
 * @throws {Error} Si une erreur survient pendant la connexion.
 */
export async function login(page: Page) {
  if (process.env.ACCESS_TOKEN) {
    await loginWithAccessToken(page);
    return;
  }

  await page.goto(`${process.env.URL_TO_ARCHIVE}/connexion`, { waitUntil: 'networkidle0' });
  
  const username = process.env.ADMIN_USERNAME ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';

  await page.type('input[name="username"]', username);
  await page.type('#password', password);

  try {
    logger.info('Logging in');
    await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })]);
    // logger.stopLoading();
    logger.success('Logged in!');
  } catch (e) {
    // logger.stopLoading();
    logger.warn('Error logging in... Username or password invalid!');
    logger.eraseLastRows(5);
    await login(page);
  }
}
