import fs from 'fs-extra';
import { parse } from 'node-html-parser';

import { logger } from './logger';

/**
 * Génère un fichier index HTML pour l'archive.
 * @param villages - Un tableau contenant les noms des villages.
 * @param archiveYear - L'année de l'archive.
 * @param dirPath - Le chemin du répertoire où sauvegarder le fichier index.
 */
export async function generateIndex(villages: string[], archiveYear: string, dirPath: string) {
  try {
    const html = (await fs.readFile(`src/index.html`, 'utf8')).replace('{{archiveYear}}', archiveYear);

    const root = parse(html);
    const $ul = root.querySelector('#villages-list');
    if ($ul) {
      for (const village of villages) {
        const url = `${dirPath.slice(7)}/index-${village
          .toLowerCase()
          .replace(/\s/gim, '-')
          .replace(/[–|-]+/gim, '-')}-phase-1`;
        $ul.appendChild(parse(`<li><a class="text" href="${url}" rel="noreferrer">${village}</a></li>`));
      }
    }

    await fs.writeFile(`${dirPath}/index.html`, root.outerHTML);
  } catch (e) {
    logger.warn(`Error generating the index file`);
  }
}
