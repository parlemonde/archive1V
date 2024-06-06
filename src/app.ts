import 'dotenv/config';
import fs from 'fs-extra';

import { archiveWebsite } from './archive';
import { logger } from './logger';

async function cleanResources() {
  try {
    await fs.remove('archive');
    await fs.remove('resources.json');
    await fs.mkdir('archive');
  } catch (e) {
    logger.warn(`Error while cleaning previous archive: ${e}`);
  }
}

async function main() {
  await cleanResources();
  await archiveWebsite();
}

main()
  .catch(logger.error)
  .then(() => {
    logger.clear();
    process.exit(0);
  });

process.stdin.resume(); //so the program will not close instantly
process.on('exit', () => logger.clear());
process.on('SIGINT', () => logger.clear());
