import mime from 'mime-types';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureDir } from './ensure-dir.ts';

const BASE_URL = 'https://1v.parlemonde.org';

async function fetchMissingResource(fullUrl: string, dirPath: string): Promise<string | undefined> {
    const res = await fetch(fullUrl);
    if (!res.ok) return undefined;

    const ext = mime.extension(res.headers.get('content-type')?.split(';')[0].trim() ?? '') ?? fullUrl.split('.').pop() ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const resourceDir = path.join(dirPath, 'ressources');
    await ensureDir(resourceDir);
    const buffer = Buffer.from(await res.arrayBuffer());
    const relativePath = path.join('/ressources', filename);
    await writeFile(path.join(resourceDir, filename), buffer);
    return relativePath;
}

export async function processCssContent(css: string, resources: Record<string, string>, dirPath: string, schoolYear: string): Promise<string> {
    // Find all unique URLs referenced in CSS that aren't in the resources map
    const missing = new Set<string>();
    for (const [, urlPath] of css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g)) {
        const fullUrl = BASE_URL + urlPath;
        if (!resources[fullUrl]) missing.add(fullUrl);
    }

    // Fetch missing resources in parallel
    await Promise.allSettled(
        [...missing].map((url) =>
            fetchMissingResource(url, dirPath).then((local) => {
                if (local) resources[url] = path.join(`/${schoolYear}`, local);
            }),
        ),
    );

    // Replace all url() references with local paths
    return css.replace(/url\(["']?(\/[^)"']+)["']?\)/g, (_match, urlPath) => {
        const local = resources[BASE_URL + urlPath];
        return local ? `url('${local}')` : _match;
    });
}
