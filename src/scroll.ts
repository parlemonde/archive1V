import type { Page } from 'puppeteer';

export async function autoScroll(page: Page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(undefined);
          }
        }, 200);
      }),
  );
}
