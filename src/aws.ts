import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import fs from 'fs-extra';
import mime from 'mime-types';
import path from 'path';

import { logger } from './logger';

const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
});

/**
 * Téléverse un fichier vers S3.
 * @param filepath - Chemin du fichier dans le bucket S3.
 * @param file - Contenu du fichier à téléverser.
 * @param contentType - Type MIME du fichier.
 * @throws {Error} Si une erreur survient pendant le téléversement.
 */
async function uploadS3File(filepath: string, file: Buffer | fs.ReadStream, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: `${process.env.S3_BUCKET_NAME ?? ''}`,
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

/**
 * Téléverse récursivement tous les fichiers d'un répertoire vers S3.
 * @param dirPath - Chemin du répertoire local à téléverser.
 */
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
  const url = `${process.env.URL_TO_ARCHIVE}/archives/${dirPath.split('/').pop()}`;
  logger.success(`Archive uploaded! Available at: ${url}`);
}
