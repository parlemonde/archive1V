import path from 'node:path';
import type { Page } from 'puppeteer';

import { ensureDir } from './ensure-dir.ts';
import { goToPage } from './go-to-page.ts';
import { exportHTML, getActivityFileName } from './html.ts';

interface ArchiveActivityArgs {
    page: Page;
    activityPath: string;
    resources: Record<string, string>;
    indexFileName: string;
    baseDir: string;
    schoolYear: string;
}

export async function archiveActivity({ page, activityPath, indexFileName, resources, baseDir, schoolYear }: ArchiveActivityArgs): Promise<string[]> {
    const filename = getActivityFileName(activityPath);
    if (!filename) {
        return [];
    }
    console.info(`Archiving activity: ${filename}`);
    await goToPage(page, activityPath);
    const html = await page.content();
    const filepath = path.join(baseDir, 'activite');
    await ensureDir(filepath);
    return await exportHTML({ filename: path.join(filepath, filename), indexFileName, baseUrl: `/${schoolYear}`, html, resources });
}
