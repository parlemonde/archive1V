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
        let css = '';
        const sheets = Array.from(document.styleSheets);
        for (const sheet of sheets) {
            if (sheet.href) continue; // skip external sheets
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
                css += rule.cssText + '\n';
            }
        }
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
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
        removeEl(
            '#__next > div > div.MuiGrid-root.MuiGrid-container.css-56fkn9 > div.app-content__card.with-shadow.MuiBox-root.css-126319q > div:nth-child(1)',
        );
        removeEl(
            '#__next > div > div.MuiGrid-root.MuiGrid-container.css-zasq5b > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-md-4.MuiGrid-grid-lg-3.MuiGrid-grid-xl-2.css-1jpce7l > aside > div.MuiBox-root.css-1y9pn73 > div:nth-child(3)',
        );
        removeEl(
            '#__next > div > div.MuiGrid-root.MuiGrid-container.css-56fkn9 > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-md-4.MuiGrid-grid-lg-3.MuiGrid-grid-xl-2.css-wkbgtj > aside > div.MuiBox-root.css-1y9pn73 > div:nth-child(3)',
        );
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
