import fs from 'fs-extra';
import mime from 'mime-types';
import type { HTTPResponse } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

import { logger } from './logger';

/**
 * Nettoie une URL en retirant le domaine de base et les paramètres de dimension.
 * @param url - L'URL à nettoyer.
 * @returns L'URL nettoyée.
 */
export function trimURL(url: string) {
  return (url.startsWith(`${process.env.URL_TO_ARCHIVE}`) ? url.slice(25) : url).replace(/&w=\d+&q=\d+$/, '');
}

/**
 * Obtient l'extension de fichier à partir d'une URL ou d'un type de contenu.
 * @param url - L'URL du fichier.
 * @param contentType - Le type de contenu MIME (optionnel).
 * @returns L'extension du fichier ou false si non trouvée.
 */
export function getFileExtension(url: string, contentType?: string): string | false {
  if (contentType) {
    const maybeExtension = mime.extension(contentType);
    if (maybeExtension) {
      return maybeExtension;
    }
  }

  try {
    const pathName = new URL(url).pathname;
    const urlSearchParams = new URLSearchParams(new URL(url).search);
    if (urlSearchParams.get('image')) {
      return mime.extension(mime.lookup(urlSearchParams.get('image') as string) || '');
    }
    if (urlSearchParams.get('url')) {
      return mime.extension(mime.lookup(urlSearchParams.get('url') as string) || '');
    }
    return mime.extension(mime.lookup(pathName) || '');
  } catch (e) {
    return false;
  }
}

/**
 * Crée une fonction de gestion des réponses de page pour sauvegarder les ressources.
 * @param dirPath - Le chemin du répertoire où sauvegarder les ressources.
 * @param ressources - Un objet pour stocker les correspondances entre URLs et chemins locaux.
 * @returns Une fonction de gestion des réponses de page.
 */
export const onPageResponse = (dirPath: string, ressources: Record<string, string>) => async (response: HTTPResponse) => {
  try {
    const url = response.url();
    const trimmedUrl = trimURL(url);

    if (!trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('data:image')) {
      return;
    }

    const resourceType = response.request().resourceType();

    if (ressources[trimmedUrl] !== undefined) {
      return;
    }

    if (resourceType === 'stylesheet' || resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
      const extension = getFileExtension(url, response.headers()['content-type']);
      if (!extension) {
        logger.warn(`File extension not found for url: ${url}`);
        return;
      }

      const fileName = `${uuidv4()}.${extension}`;
      const filePath = `${dirPath}/ressources/${fileName}`;
      ressources[trimmedUrl] = `${dirPath.slice(7)}/ressources/${fileName}`;
      response
        .buffer()
        .then((file) => {
          const writeStream = fs.createWriteStream(filePath);
          writeStream.write(file);
        })
        .catch(() => {});
    }
  } catch (e) {
    // pass
  }
};
