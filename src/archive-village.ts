import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'path';
import type { Browser, Page } from 'puppeteer';

import { exportHTML } from './html.ts';

interface ArchiveVillageArgs {
    browser: Browser;
    page: Page;
    villageId: number;
    villageName: string;
    resources: Record<string, string>;
}
export async function archiveVillage({ browser, page, villageId, villageName, resources }: ArchiveVillageArgs) {
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
        });
    }
}

interface ArchiveVillagePhaseArgs {
    page: Page;
    phase: number;
    villageName: string;
    resources: Record<string, string>;
}
async function archiveVillagePhase({ page, phase, villageName, resources }: ArchiveVillagePhaseArgs) {
    const filename = `${villageName.toLowerCase().replace(/[\s-]+/g, '-')}-phase-${phase}.html`;
    console.info(`Archiving village: ${filename}`);
    await page.evaluate(
        ({ phase }) => {
            sessionStorage.setItem('selectedPhase', `${phase}`);
        },
        { phase },
    );
    await page.goto('https://1v.parlemonde.org/?nopagination', {
        waitUntil: 'domcontentloaded',
        timeout: 5000,
    });
    await autoScroll(page);
    try {
        await page.waitForNetworkIdle({ idleTime: 600, timeout: 10000 });
    } catch {
        //
    }

    // Make React dynamic CSS inline for archive.
    await page.evaluate(() => {
        const css = [...document.styleSheets].map((s) => [...s.cssRules].map((r) => r.cssText).join('')).join('');
        document.head.appendChild(Object.assign(document.createElement('style'), { innerText: css }));
    });

    // Remove noisy dom elements
    await page.evaluate(() => {
        const removeEl = (selector: string) => {
            const $el = document.querySelector(selector);
            if ($el) {
                $el.parentNode?.removeChild($el);
            }
        };
        // World map
        removeEl('#__next > div > div:nth-child(3) > div:nth-child(2) > div.app-content__card.with-shadow > div:nth-child(1)');
        // Mobile view
        removeEl('#__next > div > div:nth-child(2)');
    });

    // Write to archive
    const html = await page.content();
    const filepath = path.join('dist');
    if (!existsSync(filepath)) {
        await mkdir(filepath, { recursive: true });
    }
    const activityPaths = await exportHTML({ filename: path.join(filepath, filename), indexFileName: filename, html, resources });
    console.info(activityPaths);
}

async function autoScroll(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 300;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            }),
    );
}
