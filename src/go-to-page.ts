import type { Page } from 'puppeteer';

export async function goToPage(page: Page, path: string) {
    await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 5000,
    });
    await autoScroll(page);
    try {
        await page.waitForNetworkIdle({ idleTime: 200, timeout: 2000 });
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
