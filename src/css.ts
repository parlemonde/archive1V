import fs from 'fs-extra';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';

import { logger } from './logger';
import { trimURL, getFileExtension } from './ressources';

const streamPipeline = util.promisify(pipeline);

/**
 * Remplace de manière asynchrone toutes les occurrences d'une regex dans une chaîne.
 * @param str - La chaîne à traiter.
 * @param regex - L'expression régulière à rechercher.
 * @param asyncFn - La fonction asynchrone à appliquer pour chaque correspondance.
 * @returns La chaîne avec les remplacements effectués.
 */
async function replaceAsync(str: string, regex: RegExp | string, asyncFn: (url: string) => Promise<string | false>) {
  const promises: Array<Promise<string | false>> = [];
  str.replace(regex, (match: string, group: string) => {
    promises.push(asyncFn(group));
    return match;
  });
  const data: Array<string | false> = [];
  for (const promise of promises) {
    data.push(await promise);
  }
  return str.replace(regex, (match: string) => {
    const newUrl = data.shift();
    if (newUrl) {
      return `url(${newUrl})`;
    }
    return match;
  });
}

/**
 * remove pagination styles
 * @param css - The CSS content to clean.
 * @returns The CSS content without pagination styles.
 */
function removePaginationStyles(css: string): string {
  css = css.replace(/\.pagination\s*{[^}]*}/g, '');
  css = css.replace(/\.pagination\s[^{]*{[^}]*}/g, '');
  
  css = css.replace(/\.MuiPagination[^{]*{[^}]*}/g, '');
  css = css.replace(/\.MuiPaginationItem[^{]*{[^}]*}/g, '');
  
  return css;
}

/**
 * Récupère un fichier depuis une URL et le sauvegarde localement.
 * @param url - L'URL du fichier à récupérer.
 * @param dirPath - Le chemin du répertoire où sauvegarder le fichier.
 * @returns Le chemin local du fichier sauvegardé, ou false en cas d'échec.
 */
async function fetchFile(url: string, dirPath: string): Promise<string | false> {
  const response = await fetch(`${process.env.URL_TO_ARCHIVE}${url}`);
  if (!response.ok || response.body === null) {
    return false;
  }

  const extension = getFileExtension(url, response.headers.get('content-type') || undefined);
  if (!extension) {
    logger.warn(`File extension not found for url: ${url}`);
    return false;
  }

  const fileName = `${uuidv4()}.${extension}`;
  const filePath = `${dirPath}/ressources/${fileName}`;
  await streamPipeline(response.body as never, fs.createWriteStream(filePath));
  return `${dirPath.slice(7)}/ressources/${fileName}`;
}

/**
 * Traite un fichier CSS en remplaçant les URLs des ressources par des chemins locaux.
 * @param fileName - Le nom du fichier CSS à traiter.
 * @param ressources - Un objet contenant les correspondances entre URLs et chemins locaux.
 * @param dirPath - Le chemin du répertoire de travail.
 */
async function handleCssFile(fileName: string, ressources: Record<string, string>, dirPath: string) {
  let css = await fs.readFile(`archive${fileName}`, 'utf8');

  css = await replaceAsync(css, /url\((\/.+?)\)/gim, async (url) => {
    try {
      const trimmedUrl = trimURL(url);
      if (ressources[trimmedUrl]) {
        return ressources[trimmedUrl];
      }

      const newUrl = await fetchFile(trimmedUrl, dirPath);
      if (newUrl) {
        ressources[trimmedUrl] = newUrl;
      }
      return newUrl;
    } catch (e) {
      return false;
    }
  });

  css = removePaginationStyles(css);

  await fs.writeFile(`archive${fileName}`, css);
}

/**
 * Traite tous les fichiers CSS référencés dans l'objet ressources.
 * @param ressources - Un objet contenant les correspondances entre URLs et chemins locaux.
 * @param dirPath - Le chemin du répertoire de travail.
 */
export async function handleAllCssFiles(ressources: Record<string, string>, dirPath: string) {
  const cssFiles = Object.values(ressources).filter((ressource) => ressource.endsWith('.css'));
  for (const file of cssFiles) {
    await handleCssFile(file, ressources, dirPath);
  }
}
