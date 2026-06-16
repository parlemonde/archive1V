import { parse } from 'node-html-parser';
import { writeFile } from 'node:fs/promises';

interface ExportHTMLArgs {
    html: string;
    filename: string;
    baseUrl: string;
    indexFileName: string;
    resources: Record<string, string>;
}

function lookup(url: string | undefined, resources: Record<string, string>): string | undefined {
    if (!url) {
        return undefined;
    }
    return resources[url] || resources[`https://1v.parlemonde.org${url}`];
}

export async function exportHTML({ html, filename, baseUrl, indexFileName, resources }: ExportHTMLArgs) {
    const root = parse(html);

    // Remove scripts
    const scripts = [...root.querySelectorAll('script'), ...root.querySelectorAll("link[as='script']")];
    for (const script of scripts) {
        script.parentNode.removeChild(script);
    }

    // Replace all resource URLs with local paths
    const elements = root.querySelectorAll('img, link, source, video, audio, [style]');
    for (const el of elements) {
        const tag = el.rawTagName.toLowerCase();

        if (tag === 'img' || tag === 'source' || tag === 'video' || tag === 'audio') {
            const src = el.getAttribute('src');
            const local = lookup(src, resources);
            if (local) el.setAttribute('src', local);
        }

        if (tag === 'img' || tag === 'source') {
            const srcset = el.getAttribute('srcset');
            if (srcset) {
                const updated = srcset
                    .split(',')
                    .map((entry) => {
                        const [urlPart, ...rest] = entry.trim().split(/\s+/);
                        const local = lookup(urlPart, resources);
                        return local ? [local, ...rest].join(' ') : entry.trim();
                    })
                    .join(', ');
                el.setAttribute('srcset', updated);
            }
        }

        if (tag === 'link') {
            const rel = el.getAttribute('rel');
            if (rel === 'stylesheet' || rel === 'preload' || el.getAttribute('as') === 'style') {
                const href = el.getAttribute('href');
                const local = lookup(href, resources);
                if (local) el.setAttribute('href', local);
            }
        }

        if (tag === 'video' || tag === 'audio') {
            const poster = el.getAttribute('poster');
            const local = lookup(poster, resources);
            if (local) el.setAttribute('poster', local);
        }

        const style = el.getAttribute('style');
        if (style) {
            el.setAttribute(
                'style',
                style.replace(/url\(["']?(.+?)["']?\)/g, (_match, urlPath) => {
                    const local = lookup(urlPath.trim(), resources);
                    return local ? `url('${local}')` : _match;
                }),
            );
        }
    }

    // Replace url() references inside <style> tags
    for (const styleEl of root.querySelectorAll('style')) {
        const text = styleEl.textContent;
        if (!text) continue;
        const updated = text.replace(/url\(["']?([^)"']+)["']?\)/g, (_match, urlPath) => {
            const local = lookup(urlPath.trim(), resources);
            return local ? `url('${local}')` : _match;
        });
        if (updated !== text) {
            styleEl.textContent = updated;
        }
    }

    // Rewrite links
    const activityPaths = new Set<string>();
    for (const a of root.querySelectorAll('a')) {
        const href = a.getAttribute('href');
        if (!href) continue;
        try {
            const parsed = new URL(href, 'https://1v.parlemonde.org');
            if (parsed.origin !== 'https://1v.parlemonde.org') {
                // do nothing, external URL
            } else if (parsed.pathname.startsWith('/activite/')) {
                // Push activity to paths to get archived.
                const activityPath = parsed.toString();
                const filename = getActivityFileName(activityPath);
                if (filename) {
                    activityPaths.add(activityPath);
                    a.setAttribute('data-original-href', activityPath);
                    a.setAttribute('href', `${baseUrl}/activite/${filename}`);
                } else {
                    a.setAttribute('href', `${baseUrl}/${indexFileName}`);
                }
            } else {
                // Reset url to index, it won't get archived.
                const isRootPath = parsed.pathname === '/';
                a.setAttribute('href', `${baseUrl}/${indexFileName}${isRootPath ? parsed.search : ''}`);
            }
        } catch {
            // invalid URL, skip
        }
    }

    // Update phase links
    for (const node of root.querySelectorAll('.MuiBox-root.css-bisved')) {
        if (node.children.length === 3) {
            for (const [index, child] of Object.entries(node.children)) {
                const childIndex = Number(index);
                const a = parse('<a></a>').querySelector('a')!;
                a.setAttribute('href', `${baseUrl}/${indexFileName.replace(/phase-\d+/, `phase-${childIndex + 1}`)}`);
                a.innerHTML = child.innerHTML;
                a.setAttribute('class', child.getAttribute('class') ?? '');
                a.setAttribute('style', child.getAttribute('style') ?? '');
                child.replaceWith(a);
            }
        }
    }

    // Update change village
    const villageButton = root.querySelector('#__next > div > header > div > div.header__user > div.MuiBox-root.css-13tqxrv > div > div > button');
    if (villageButton) {
        const a = parse('<a></a>').querySelector('a')!;
        a.setAttribute('href', `${baseUrl}`);
        a.innerHTML = villageButton.innerHTML;
        a.setAttribute('class', villageButton.getAttribute('class') ?? '');
        a.setAttribute('style', villageButton.getAttribute('style') ?? '');
        villageButton.replaceWith(a);
    }

    // Save file
    await writeFile(filename, root.outerHTML);

    return [...activityPaths];
}

export function getActivityFileName(activityPath: string): string | undefined {
    try {
        const url = new URL(activityPath, 'https://1v.parlemonde.org');
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length !== 2 || segments[0] !== 'activite') {
            return undefined;
        }
        const name = segments[1].toLowerCase().replace(/[\s-]+/g, '-');
        const query = url.searchParams.toString();
        return query ? `${name}-${query}.html` : `${name}.html`;
    } catch {
        // ignore
        return undefined;
    }
}
