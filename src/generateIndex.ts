import fs from 'fs-extra';
import { parse } from 'node-html-parser';
import type { PromptObject } from 'prompts';
import prompts from 'prompts';

import { logger } from './logger';

const YEAR_PROMPTS: PromptObject<'year'> = {
  type: 'text',
  name: 'year',
  message: "What's archive year?",
};

export async function promptYear() {
  const year = ((await prompts(YEAR_PROMPTS)) as Record<'year', string>).year;
  return year;
}

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
