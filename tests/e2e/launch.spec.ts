import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { DEMO_URL, expect, resultBody, test } from './fixtures';

// Launch images (docs/launch): store screenshots at 1280 × 800 and the 1280 × 640 social preview.
// Opt in with FT_LAUNCH=1: `FT_LAUNCH=1 pnpm test:e2e launch`. Every pixel of product UI is the real
// built extension on the made-up demo store; the social preview frames a real capture of a fold card
// with the product name and one line of text.

const OUT = join(process.cwd(), 'docs', 'launch');

test.skip(!process.env.FT_LAUNCH, 'set FT_LAUNCH=1 to write the launch images');
test.setTimeout(180_000);

mkdirSync(OUT, { recursive: true });

/** The demo's five-listing group: $11.99 to $34.99, brand tax $23. */
const bigCard = (page: Page): Locator =>
  page.locator('factory-twins-card').filter({ hasText: 'These 5 listings use the same photo' });

async function settle(page: Page, ms = 1300) {
  await page.waitForTimeout(ms);
}

function fontData(file: string): string {
  return readFileSync(join(process.cwd(), 'public', 'fonts', file)).toString('base64');
}

test('store screenshots and social preview', async ({ page, context }) => {
  // The demo page's editorial widget points at a store image URL that does not exist; show one of the
  // demo's own made-up photos there instead of a broken-image icon. The extension never reads it.
  const demoImg = join(process.cwd(), 'tests', 'fixtures', 'demo', 'laptop-stand', 'img');
  const editorial = readdirSync(demoImg).find((f) => f.endsWith('.jpg')) as string;
  await page.route('https://m.media-amazon.com/**', (route) =>
    route.fulfill({ contentType: 'image/jpeg', body: readFileSync(join(demoImg, editorial)) }),
  );
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(DEMO_URL);
  await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
  await expect(resultBody(page)).toContainText('up to $23 brand tax');

  // 1. Rings: start the frame at the first tile of the five-listing group.
  await page.keyboard.press('t');
  await page
    .locator('factory-twins-tile')
    .filter({ hasText: '×5' })
    .first()
    .evaluate((el) => {
      (el.parentElement ?? el).scrollIntoView({ block: 'start' });
      window.scrollBy(0, -40);
    });
  await settle(page, 500);
  await page.screenshot({ path: join(OUT, 'store-2-rings.png') });

  // 2. Folded: the five-listing card, centred.
  await page.keyboard.press('f');
  await settle(page);
  const card = bigCard(page);
  await expect(card).toHaveCount(1);
  await card.evaluate((el) => {
    el.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -96);
  });
  await settle(page, 600);
  await page.screenshot({ path: join(OUT, 'store-1-fold.png') });
  const cardPng = await card.screenshot({ path: join(OUT, 'fold-card.png') });

  // 3. Proof lens on that group, Difference view.
  await card.getByRole('button', { name: /Check the pixels/ }).click();
  await settle(page, 900);
  await page.keyboard.press('d');
  await settle(page, 900);
  await page.screenshot({ path: join(OUT, 'store-3-lens.png') });

  // 4. Social preview, 1280 × 640: the real fold card on the product's own paper colour.
  const social = await context.newPage();
  await social.setViewportSize({ width: 1280, height: 640 });
  await social.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Bricolage'; src: url(data:font/woff2;base64,${fontData('bricolage-grotesque-wdth85-latin.woff2')}) format('woff2'); font-weight: 200 800; font-stretch: 75% 100%; }
    @font-face { font-family: 'Rethink'; src: url(data:font/woff2;base64,${fontData('rethink-sans-latin-wght.woff2')}) format('woff2'); font-weight: 400 800; }
    html, body { margin: 0; width: 1280px; height: 640px; overflow: hidden; }
    body { background: #fcf9fb; color: #24191f; font-family: 'Rethink', sans-serif; display: grid;
      grid-template-rows: auto 1fr; padding: 48px 56px 40px; box-sizing: border-box; gap: 28px; }
    header { display: flex; align-items: baseline; justify-content: space-between; gap: 32px; }
    h1 { font-family: 'Bricolage', sans-serif; font-stretch: 85%; font-weight: 700; font-size: 64px;
      line-height: 1; letter-spacing: -0.02em; margin: 0; }
    p { margin: 0; font-size: 24px; line-height: 1.3; color: #61545b; max-width: 640px; text-align: right; }
    .card { display: flex; align-items: flex-start; justify-content: center; min-height: 0; }
    img { max-width: 100%; max-height: 100%; border-radius: 16px; box-shadow: 0 1px 2px rgb(36 25 31 / 0.08), 0 12px 32px rgb(36 25 31 / 0.10); }
    small { position: absolute; left: 56px; bottom: 14px; font-size: 14px; color: #7a6e74; }
  </style></head><body>
    <header><h1>Factory Twins</h1><p>Same factory photo, five brand names. See the price ladder, check the pixels.</p></header>
    <div class="card"><img alt="" src="data:image/png;base64,${cardPng.toString('base64')}"></div>
    <small>Real extension on a made-up demo store. All listings are invented.</small>
  </body></html>`);
  await social.evaluate(() => document.fonts.ready);
  await settle(social, 300);
  await social.screenshot({ path: join(OUT, 'social-preview.png') });
  await social.close();
});
