import fs from 'fs-extra';
import type { HTMLElement } from 'node-html-parser';
import { parse } from 'node-html-parser';

import { logger } from './logger';

/**
 * Supprime tous les scripts d'un élément HTML.
 * @param el - L'élément HTML à nettoyer.
 */
function stripScripts(el: HTMLElement) {
  const scripts = [...el.querySelectorAll('script'), ...el.querySelectorAll("link[as='script']")];
  for (const script of scripts) {
    script.parentNode.removeChild(script);
  }
}

/**
 * Met à jour les sources des images dans un élément HTML.
 * @param el - L'élément HTML contenant les images.
 * @param ressources - Un objet contenant les correspondances entre URLs et chemins locaux.
 */
function updateImages(el: HTMLElement, ressources: Record<string, string>) {
  const images = el.querySelectorAll('img');
  for (const image of images) {
    const oldSrc = image.getAttribute('src');
    const newSrc = oldSrc ? ressources[oldSrc.replace(/&w=\d+&q=\d+$/, '')] : null;
    if (oldSrc && newSrc) {
      image.setAttribute('src', newSrc);
      image.removeAttribute('srcset');
    }
  }
}

/**
 * Met à jour les liens CSS dans un élément HTML.
 * @param el - L'élément HTML contenant les liens CSS.
 * @param ressources - Un objet contenant les correspondances entre URLs et chemins locaux.
 */
function updateCssLinks(el: HTMLElement, ressources: Record<string, string>) {
  const links = [...el.querySelectorAll("link[rel='stylesheet']"), ...el.querySelectorAll("link[as='style']")];
  for (const link of links) {
    const oldHref = link.getAttribute('href');
    const newHref = oldHref ? ressources[oldHref.replace(/&w=\d+&q=\d+$/, '')] : null;
    if (oldHref && newHref) {
      link.setAttribute('href', newHref);
    }
  }
}

/**
 * Met à jour les liens vers l'index dans un élément HTML.
 * @param el - L'élément HTML contenant les liens.
 * @param index - Le nom du fichier index.
 */
function updateIndex(el: HTMLElement, index: string) {
  const els = el.querySelectorAll('a').filter((a) => (a.getAttribute('href') || '') === '/');
  els.forEach((el) => {
    el.setAttribute('href', `/${index}`);
  });
}

/**
 * Récupère les chemins des prochaines pages à archiver.
 * @param el - L'élément HTML contenant les liens.
 * @returns Un tableau de chemins de pages.
 */
function getNextPathNames(el: HTMLElement): string[] {
  return el
    .querySelectorAll('a')
    .map((a) => a.getAttribute('href') || '')
    .filter((href) => href.length > 0 && href.startsWith('/activite/'))
    .map((href) => href.slice(1));
}

/**
 * Met à jour tous les liens dans un élément HTML.
 * @param el - L'élément HTML contenant les liens.
 * @param dirPath - Le chemin du répertoire de base.
 */
function updateAllLinks(el: HTMLElement, dirPath: string) {
  const els = el.querySelectorAll('a').filter((a) => (a.getAttribute('href') || '').startsWith('/'));
  els.forEach((el) => {
    el.setAttribute('href', `${dirPath}${el.getAttribute('href') || ''}`);
  });
}

/**
 * Exporte une page HTML en effectuant diverses transformations.
 * @param dirPath - Le chemin du répertoire où sauvegarder le fichier HTML.
 * @param pathName - Le chemin de la page.
 * @param html - Le contenu HTML de la page.
 * @param ressources - Un objet contenant les correspondances entre URLs et chemins locaux.
 * @param index - Le nom du fichier index.
 * @returns Un tableau de chemins des prochaines pages à archiver.
 */
export async function exportHTML(dirPath: string, pathName: string, html: string, ressources: Record<string, string>, index: string) {
  // 1. mount html.
  const root = parse(html);

  // 2. remove all scripts tag and prefetch script links.
  stripScripts(root);

  // 3. update all ressources to use local urls.
  updateImages(root, ressources);
  updateCssLinks(root, ressources);

  // 4. update root index.
  updateIndex(root, index);

  const nextPathNames = getNextPathNames(root);

  const headerButtons = root.querySelectorAll('header button');
  if (headerButtons.length > 0) {
    headerButtons[0].rawTagName = 'A';
    headerButtons[0].setAttribute('href', '/');
    headerButtons[0].setAttribute('rel', 'noreferrer');
  }

  // 5. update all links
  updateAllLinks(root, dirPath.slice(7));

  try {
    await fs.writeFile(`${dirPath}/${pathName || index}.html`, root.outerHTML);
  } catch (e) {
    logger.warn(`Error writing html file for pathname: ${pathName || index}`);
  }

  return nextPathNames;
}
