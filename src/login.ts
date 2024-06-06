import type { PromptObject } from 'prompts';
import prompts from 'prompts';
import type { Page } from 'puppeteer';

import { logger } from './logger';

type LOGIN_KEYS = 'username' | 'password';

const LOGIN_PROMPTS: PromptObject<LOGIN_KEYS>[] = [
  {
    type: 'text',
    name: 'username',
    message: 'Enter your username:',
  },
  {
    type: 'password',
    name: 'password',
    message: 'Enter your password:',
  },
];

const RETRY_PROMPTS: PromptObject<'confirm'> = {
  type: 'confirm',
  name: 'confirm',
  message: 'Retry login?',
};

async function loginWithAccessToken(page: Page) {
  try {
    logger.startLoading('Logging in');
    await page.setCookie({ name: 'access-token', value: process.env.ACCESS_TOKEN || '', domain: '1v.parlemonde.org' });
    await page.goto(`https://1v.parlemonde.org`, { waitUntil: 'networkidle0' });
    logger.stopLoading();
    logger.success('Logged in!');
  } catch (e) {
    logger.error(e);
  }
}

export async function login(page: Page) {
  if (process.env.ACCESS_TOKEN) {
    await loginWithAccessToken(page);
    return;
  }

  await page.goto(`https://1v.parlemonde.org/connexion`, { waitUntil: 'networkidle0' });
  const response = (await prompts(LOGIN_PROMPTS)) as Record<LOGIN_KEYS, string>;

  await page.type('input[name="username"]', response.username);
  await page.type('#password', response.password);

  try {
    logger.startLoading('Logging in');
    await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })]);
    logger.stopLoading();
    logger.success('Logged in!');
  } catch (e) {
    logger.stopLoading();
    logger.warn('Error logging in... Username or password invalid!');
    const retry = (await prompts(RETRY_PROMPTS)) as Record<'confirm', boolean>;
    if (retry.confirm) {
      logger.eraseLastRows(5);
      await login(page);
    }
  }
}
