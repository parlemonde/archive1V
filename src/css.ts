import fs from 'fs-extra';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import util from 'util';
import { v4 as uuidv4 } from 'uuid';

import { logger } from './logger';
import { trimURL, getFileExtension } from './ressources';

const streamPipeline = util.promisify(pipeline);

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

async function fetchFile(url: string, dirPath: string): Promise<string | false> {
  const response = await fetch(`https://1v.parlemonde.org${url}`);
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

  await fs.writeFile(`archive${fileName}`, css);
}

export async function handleAllCssFiles(ressources: Record<string, string>, dirPath: string) {
  const cssFiles = Object.values(ressources).filter((ressource) => ressource.endsWith('.css'));
  for (const file of cssFiles) {
    await handleCssFile(file, ressources, dirPath);
  }
}
