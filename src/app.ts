import 'dotenv/config';
import fs from 'fs-extra';

import { archiveWebsite } from './archive';
import { logger } from './logger';

// Déterminer l'environnement en cours d'utilisation
const currentEnv = process.env.CURRENT_ENV || 'staging';

/**
 * Nettoie les ressources existantes en supprimant le dossier 'archive' et le fichier 'resources.json',
 * puis crée un nouveau dossier 'archive'.
 * @throws {Error} Si une erreur survient pendant le nettoyage.
 */
async function cleanResources() {
  try {
    await fs.remove('archive');
    await fs.remove('resources.json');
    await fs.mkdir('archive');
  } catch (e) {
    logger.warn(`Error while cleaning previous archive: ${e}`);
  }
}

/**
 * Fonction principale qui exécute le processus d'archivage.
 * Nettoie d'abord les ressources existantes, puis lance l'archivage du site web.
 */
async function run() {
  try {
    logger.infoBold(`======= Running in ${currentEnv.toUpperCase()} environment =======`);
    
    // Vérifie que les variables d'environnement requises sont définies
    const urlToArchive = process.env.URL_TO_ARCHIVE;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const s3AccessKey = process.env.S3_ACCESS_KEY;
    const s3SecretKey = process.env.S3_SECRET_KEY;
    const s3BucketName = process.env.S3_BUCKET_NAME;
    
    if (!urlToArchive || !adminUsername || !adminPassword || !s3AccessKey || !s3SecretKey || !s3BucketName) {
      logger.error(`Some required environment variables are missing for the ${currentEnv} environment.`);
      return;
    }
    
    await cleanResources();
    await archiveWebsite();
  } catch (error) {
    logger.error(error);
  } finally {
    logger.clear();
    process.exit(0);
  }
}

run()

process.stdin.resume(); //so the program will not close instantly
process.on('exit', () => logger.clear());
process.on('SIGINT', () => logger.clear());
