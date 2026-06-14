import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime-types';

const BASE_URL = 'https://1v.parlemonde.org';

async function fetchMissingResource(fullUrl: string, dirPath: string): Promise<string | undefined> {
    const res = await fetch(fullUrl);
    if (!res.ok) return undefined;

    const ext = mime.extension(res.headers.get('content-type')?.split(';')[0].trim() ?? '')
        ?? fullUrl.split('.').pop()
        ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const resourceDir = path.join(dirPath, 'ressources');
    if (!existsSync(resourceDir)) {
        await mkdir(resourceDir, { recursive: true });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const relativePath = path.relative(dirPath, path.join(resourceDir, filename));
    await writeFile(path.join(resourceDir, filename), buffer);
    return relativePath;
}

export async function handleAllCssFiles(resources: Record<string, string>, dirPath: string) {
    const cssFiles = Object.values(resources).filter((r) => r.endsWith('.css'));

    for (const filePath of cssFiles) {
        const fullPath = path.join(dirPath, filePath);
        let css: string;
        try {
            css = await readFile(fullPath, 'utf-8');
        } catch {
            continue;
        }

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
                    if (local) resources[url] = local;
                }),
            ),
        );

        // Replace all url() references with local paths
        css = css.replace(/url\(["']?(\/[^)"']+)["']?\)/g, (_match, urlPath) => {
            const local = resources[BASE_URL + urlPath];
            return local ? `url('${local}')` : _match;
        });

        await writeFile(fullPath, css);
    }
}
