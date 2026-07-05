import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

import { archiveVillage } from './archive-village.ts';
import { uploadArchiveToS3 } from './aws.ts';
import { ensureDir } from './ensure-dir.ts';
import { generateIndex } from './generateIndex.ts';
import { onPageResponse } from './resources.ts';

try {
    process.loadEnvFile();
} catch {
    // Ok to fail
}

const today = new Date();
const month = today.getMonth() + 1; // 1-based
const year = today.getFullYear();
const schoolYear = month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = path.join(__dirname, '..', `dist/${schoolYear}`);
await ensureDir(baseDir);

let resources: Record<string, string> = {};
try {
    const raw = await readFile(path.join(baseDir, 'ressources.json'), 'utf-8');
    resources = JSON.parse(raw);
} catch {
    // fresh start
}

async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        ...(process.env.PUPPETEER_NO_SANDBOX === 'true' && { args: ['--no-sandbox'] }),
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
        page.on('response', onPageResponse(baseDir, resources, schoolYear));

        // Get villages
        await page.goto('https://1v.parlemonde.org/api/villages');
        await page.content();
        const villages = await page.evaluate(() => {
            return JSON.parse(document.querySelector('body')?.innerText || '[]') as { id: number; name: string }[];
        });

        // Archive each village
        const visitedActivities = new Set<string>();
        for (const village of villages) {
            await archiveVillage({
                browser,
                page,
                villageId: village.id,
                villageName: village.name,
                resources,
                visitedActivities,
                baseDir,
                schoolYear,
            });
        }

        // Generate index
        await generateIndex(
            villages.map((v) => v.name),
            schoolYear,
            baseDir,
        );

        // Upload to S3
        const s3Bucket = process.env.AWS_S3_BUCKET;
        if (s3Bucket) {
            console.info('Uploading archive to S3…');
            await uploadArchiveToS3(s3Bucket, baseDir, `archives/${schoolYear}`);
        }
    } catch (error) {
        console.error(error);
    }

    await browser.close();
}

function exitHandler() {
    writeFileSync(path.join(baseDir, 'ressources.json'), JSON.stringify(resources));
}
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);

main().catch(console.error);
