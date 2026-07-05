import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from 'puppeteer';

import { archiveActivity } from './archive-activity.ts';
import { goToPage } from './go-to-page.ts';
import { exportHTML } from './html.ts';
import { getActivityPathsFromArchived } from './read-archived.ts';

interface ArchiveVillageArgs {
    browser: Browser;
    page: Page;
    villageId: number;
    villageName: string;
    resources: Record<string, string>;
    visitedActivities: Set<string>;
    baseDir: string;
    schoolYear: string;
}
export async function archiveVillage({
    browser,
    page,
    villageId,
    villageName,
    resources,
    visitedActivities,
    baseDir,
    schoolYear,
}: ArchiveVillageArgs) {
    await browser.setCookie({
        domain: '1v.parlemonde.org',
        name: 'village-id',
        value: `${villageId}`,
    });
    for (const phase of [1, 2, 3]) {
        await archiveVillagePhase({
            page,
            phase,
            villageName,
            resources,
            visitedActivities,
            baseDir,
            schoolYear,
        });
    }
}

interface ArchiveVillagePhaseArgs {
    page: Page;
    phase: number;
    villageName: string;
    resources: Record<string, string>;
    visitedActivities: Set<string>;
    baseDir: string;
    schoolYear: string;
}
async function archiveVillagePhase({ page, phase, villageName, resources, visitedActivities, baseDir, schoolYear }: ArchiveVillagePhaseArgs) {
    const filename = `${villageName.toLowerCase().replace(/[\s-]+/g, '-')}-phase-${phase}.html`;
    const fullpath = path.join(baseDir, filename);
    const activityPaths: string[] = [];
    if (existsSync(fullpath)) {
        activityPaths.push(...(await getActivityPathsFromArchived(fullpath)));
    } else {
        console.info(`Archiving village: ${filename}`);
        await page.evaluate(
            ({ phase }) => {
                sessionStorage.setItem('selectedPhase', `${phase}`);
            },
            { phase },
        );
        await goToPage(page, 'https://1v.parlemonde.org/?nopagination');
        const html = await page.content();
        activityPaths.push(
            ...(await exportHTML({
                filename: path.join(baseDir, filename),
                indexFileName: filename,
                baseUrl: `/archives/${schoolYear}`,
                html,
                resources,
            })),
        );
    }
    while (activityPaths.length > 0) {
        const activityPath = activityPaths.pop();
        if (!activityPath) {
            break;
        }
        if (visitedActivities.has(activityPath)) {
            continue;
        }
        visitedActivities.add(activityPath);
        activityPaths.push(
            ...(await archiveActivity({
                page,
                activityPath,
                resources,
                baseDir,
                schoolYear,
                indexFileName: filename,
            })),
        );
    }
}
