import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import fs from 'fs-extra';
import mime from 'mime-types';
import path from 'path';

import { logger } from './logger';

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
});

async function uploadS3File(filepath: string, file: Buffer | fs.ReadStream, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filepath,
    Body: file,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
  } catch (err) {
    console.error(err);
  }
}

export async function upload(dirPath: string) {
  const uploadDir = async (currentPath: string) => {
    for (const name of fs.readdirSync(currentPath)) {
      const filePath = path.join(currentPath, name);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        await uploadS3File(filePath.slice(12), fs.readFileSync(filePath), mime.lookup(filePath) || '');
      } else if (stat.isDirectory()) {
        await uploadDir(filePath);
      }
    }
  };

  logger.startLoading(`Uploading archive to S3, to access it from the browser!`);
  await uploadDir(dirPath);
  logger.stopLoading();
  const url = process.env.USE_MINIO ? `http://localhost:5000/api` : `https://1v.parlemonde.org/api`;
  logger.success(`Archive uploaded! Available at: ${url}${dirPath.slice(12)}`);
}
