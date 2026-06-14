import { parse } from 'node-html-parser';
import { writeFile } from 'node:fs/promises';

interface ExportHTMLArgs {
    html: string;
    filename: string;
    resources: Record<string, string>;
}

function lookup(url: string | undefined, resources: Record<string, string>): string | undefined {
    return !url ? undefined : resources[url] || resources[`https://1v.parlemonde.org${url}`] || undefined;
}

export async function exportHTML({ html, filename, resources }: ExportHTMLArgs) {
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

    // Save file
    await writeFile(filename, root.outerHTML);
}
