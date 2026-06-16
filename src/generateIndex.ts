import { parse } from 'node-html-parser';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function generateIndex(villages: string[], schoolYear: string, dirPath: string) {
    const html = (await readFile(`src/index.html`, 'utf8')).replace('{{archiveYear}}', schoolYear);
    const root = parse(html);
    const $ul = root.querySelector('#villages-list');
    if ($ul) {
        for (const village of villages) {
            const url = `/${schoolYear}/${village.toLowerCase().replace(/[\s-]+/g, '-')}-phase-1.html`;
            $ul.appendChild(parse(`<li><a class="text" href="${url}" rel="noreferrer">${village}</a></li>`));
        }
    }
    await writeFile(path.join(dirPath, 'index.html'), root.outerHTML);
}
