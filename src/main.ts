import { rm } from 'fs/promises';
import puppeteer from 'puppeteer';

import { archiveVillage } from './archive-village.ts';
import { onPageResponse } from './resources.ts';

try {
    process.loadEnvFile();
} catch {
    // Ok to fail
}

async function main() {
    await rm('dist', {
        recursive: true,
        force: true,
    });
    const browser = await puppeteer.launch({
        headless: true,
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 1024 });

        // Login
        await page.goto('https://1v.parlemonde.org/connexion');
        await page.type('input[name="username"]', process.env.USERNAME ?? '');
        await page.type('#password', process.env.PASSWORD ?? '');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });

        // Intercept resources
        const resources: Record<string, string> = {};
        page.on('response', onPageResponse('dist', resources));

        // Get villages
        await page.goto('https://1v.parlemonde.org/api/villages');
        await page.content();
        const villages = await page.evaluate(() => {
            return JSON.parse(document.querySelector('body')?.innerText || '[]') as { id: number; name: string }[];
        });

        // Archive each village
        const visitedActivities = new Set<string>();
        for (const village of villages.slice(0, 1)) {
            await archiveVillage({
                browser,
                page,
                villageId: village.id,
                villageName: village.name,
                resources,
                visitedActivities,
            });
        }
    } catch (error) {
        console.error(error);
    }

    await browser.close();
}

main().catch(console.error);
