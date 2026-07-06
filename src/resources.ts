import mime from 'mime-types';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { HTTPResponse } from 'puppeteer';

import { processCssContent } from './css.ts';
import { ensureDir } from './ensure-dir.ts';

function getExtension(url: string, contentType?: string, resourceType?: string): string | undefined {
    if (url.startsWith('data:')) return undefined;

    if (contentType) {
        const ext = mime.extension(contentType.split(';')[0].trim());
        if (ext) return ext;
    }

    try {
        const parsed = new URL(url);
        const param = parsed.searchParams.get('image') ?? parsed.searchParams.get('url');
        if (param) {
            const dotIndex = param.lastIndexOf('.');
            if (dotIndex !== -1) return param.slice(dotIndex + 1);
        }
        const pathname = parsed.pathname;
        const dotIndex = pathname.lastIndexOf('.');
        if (dotIndex !== -1) return pathname.slice(dotIndex + 1);
    } catch {
        // invalid URL
    }

    if (resourceType === 'image') return 'png';
    if (resourceType === 'font') return 'woff2';
    if (resourceType === 'media') return 'mp4';
    if (resourceType === 'stylesheet') return 'css';
    return undefined;
}

export function onPageResponse(dirPath: string, resources: Record<string, string>, schoolYear: string) {
    return async (response: HTTPResponse): Promise<void> => {
        const url = response.url().trim();
        if (url.startsWith('data:')) return;
        if (resources[url]) return;

        const resourceType = response.request().resourceType();
        if (!['stylesheet', 'image', 'media', 'font'].includes(resourceType)) return;

        const ext = getExtension(url, response.headers()['content-type'], resourceType);
        if (!ext) return;

        const filename = `${randomUUID()}.${ext}`;
        const resourceDir = path.join(dirPath, 'ressources');
        resources[url] = path.join(`/api/archives/${schoolYear}`, 'ressources', filename);

        let buffer: Buffer;
        try {
            buffer = await response.buffer();
        } catch {
            try {
                const res = await fetch(url);
                buffer = Buffer.from(await res.arrayBuffer());
            } catch {
                console.warn('Could not save:', url);
                return;
            }
        }

        try {
            await ensureDir(resourceDir);
            const filePath = path.join(resourceDir, filename);
            if (ext === 'css') {
                const processed = await processCssContent(buffer.toString(), resources, dirPath, schoolYear);
                await writeFile(filePath, processed);
            } else {
                await writeFile(filePath, buffer);
            }
        } catch {
            console.warn('Could not write resource file:', url);
        }
    };
}
