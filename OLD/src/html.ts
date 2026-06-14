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
 * remove all pagination elements
 * @param el - The HTML element to clean.
 */
function removePagination(el: HTMLElement) {
  const paginationElements = el.querySelectorAll('.pagination');
  for (const paginationElement of paginationElements) {
    paginationElement.parentNode.removeChild(paginationElement);
  }

  const muiPaginationElements = el.querySelectorAll('.MuiPagination-root');
  for (const muiPaginationElement of muiPaginationElements) {
    muiPaginationElement.parentNode.removeChild(muiPaginationElement);
  }
  
  const elementWithDataPagination = el.querySelectorAll('[data-pagination]');
  for (const element of elementWithDataPagination) {
    element.removeAttribute('data-pagination');
  }

  const possibleHiddenItems = el.querySelectorAll('.activity');
  for (const item of possibleHiddenItems) {
    item.setAttribute('style', 'display: block; margin-bottom: 1rem;');
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

  // 3. remove pagination elements
  removePagination(root);
  
  // 4. update all ressources to use local urls.
  updateImages(root, ressources);
  updateCssLinks(root, ressources);

  // 5. update root index.
  updateIndex(root, index);

  const nextPathNames = getNextPathNames(root);

  const headerButtons = root.querySelectorAll('header button');
  if (headerButtons.length > 0) {
    headerButtons[0].rawTagName = 'A';
    headerButtons[0].setAttribute('href', '/');
    headerButtons[0].setAttribute('rel', 'noreferrer');
  }

  // 6. update all links
  updateAllLinks(root, dirPath.slice(7));

  // 7. deactivate all pagination behavior
  const head = root.querySelector('head');
  if (head) {
    const noPaginationScript = parse(`
      <script>
        // Cette fonction s'exécute au chargement de la page
        window.addEventListener('DOMContentLoaded', function() {
          // Afficher tous les éléments qui pourraient être cachés par la pagination
          var activities = document.querySelectorAll('.activity, [class*="activity-"], [id*="activity-"]');
          activities.forEach(function(activity) {
            activity.style.display = 'block';
            activity.style.marginBottom = '1rem';
          });

          // Supprimer les sélecteurs de nombre d'éléments par page
          var paginationSelectors = document.querySelectorAll('[class*="pagination"], [id*="pagination"], [class*="MuiPagination"], [id*="MuiPagination"]');
          paginationSelectors.forEach(function(element) {
            if (element.parentNode) {
              element.parentNode.removeChild(element);
            }
          });

          // Remplacer toute fonction de pagination qui pourrait être chargée après
          window.setTimeout(function() {
            // Accès typesafe à la propriété MuiPagination
            if (window && typeof window === 'object') {
              var w = window;
              if ('MuiPagination' in w) {
                w['MuiPagination'] = null;
              }
            }
          }, 100);
        });
      </script>
    `);
    head.appendChild(noPaginationScript.childNodes[0]);
  }

  try {
    await fs.writeFile(`${dirPath}/${pathName || index}.html`, root.outerHTML);
  } catch (e) {
    logger.warn(`Error writing html file for pathname: ${pathName || index}`);
  }

  return nextPathNames;
}
