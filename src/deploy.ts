import 'dotenv/config';

import { logger } from './logger';
import { promptYear } from './generateIndex';
import { upload } from './aws';

async function main() {
  logger.infoBold('======= Deploying new Archive =======');
  const year = await promptYear(); // '2022-2023'
  const dirPath = `archive/api/archives/${year.replace(/\//gim, '-')}`;
  await upload(dirPath);
  logger.success(`Done!`);
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
