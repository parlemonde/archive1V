import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Page } from 'puppeteer';

import { ensureDir } from './ensure-dir.ts';
import { goToPage } from './go-to-page.ts';
import { exportHTML, getActivityFileName } from './html.ts';
import { getActivityPathsFromArchived } from './read-archived.ts';

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
    const filepath = path.join(baseDir, 'activite');
    const fullPath = path.join(filepath, filename);
    if (existsSync(fullPath)) {
        return await getActivityPathsFromArchived(fullPath);
    }
    console.info(`Archiving activity: ${filename}`);
    await ensureDir(filepath);
    await goToPage(page, activityPath);
    const html = await page.content();
    return await exportHTML({ filename: fullPath, indexFileName, baseUrl: `/${schoolYear}`, html, resources });
}
