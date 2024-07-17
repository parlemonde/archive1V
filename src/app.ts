import 'dotenv/config';
import fs from 'fs-extra';

import { archiveWebsite } from './archive';
import { logger } from './logger';

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
