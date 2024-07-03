import 'dotenv/config';

import { logger } from './logger';
import { upload } from './aws';

async function main() {
  logger.infoBold('======= Deploying new Archive =======');
  logger.info(`==> YEAR : ${process.env.YEAR ?? ''}`);
  logger.info(`==> S3_BUCKET_NAME : ${process.env.S3_BUCKET_NAME ?? ''}`);
  
  const year = process.env.YEAR ?? '';
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
