import { parse } from 'node-html-parser';
import { readFile } from 'node:fs/promises';

export async function getActivityPathsFromArchived(filePath: string): Promise<string[]> {
    try {
        const html = await readFile(filePath, 'utf-8');
        const root = parse(html);
        const paths = new Set<string>();
        for (const a of root.querySelectorAll('a[data-original-href]')) {
            const original = a.getAttribute('data-original-href');
            if (original) {
                paths.add(original);
            }
        }
        return [...paths];
    } catch {
        return [];
    }
}
