// Dev helper: screenshots of the states a reviewer asks about, at 375, 768 and 1440 px, light and dark:
// the landing hero folded, the brand-tax beat, the real-product beat, and the web app with the bundled
// sample (results, folded card, lens in onion skin). Viewport-sized, not full page, so "above the fold"
// is what you see.
// Usage: pnpm build, then pnpm serve (other shell), then: pnpm tsx scripts/qa-shots.ts <outDir> [widths]
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'qa-shots';
const widths = (process.argv[3] ?? '375,768,1440').split(',').map(Number);
const ORIGIN = 'http://127.0.0.1:4182';
mkdirSync(out, { recursive: true });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png` });
}

const browser = await chromium.launch();
for (const w of widths) {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: w === 375 ? 812 : 900 },
      deviceScaleFactor: 1,
      colorScheme: scheme,
      hasTouch: w < 768,
      isMobile: w < 768,
    });
    const page = await ctx.newPage();
    const tag = `${w}-${scheme}`;

    await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });
    await page.locator('[data-demo="fold"]').click();
    await page.waitForTimeout(1400);
    await page.locator('#demo .fold-card').first().scrollIntoViewIfNeeded();
    await shot(page, `landing-hero-folded-${tag}`);
    await page.locator('#h-same').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -80));
    await page.locator('.real-shot img').evaluate((img: HTMLImageElement) => img.decode().catch(() => {}));
    await shot(page, `landing-real-${tag}`);
    await page.locator('.card-crop').scrollIntoViewIfNeeded();
    await shot(page, `landing-tax-${tag}`);

    await page.goto(`${ORIGIN}/app/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Try a sample' }).first().click();
    await page.locator('.tile').nth(59).waitFor({ timeout: 20_000 });
    await shot(page, `app-results-${tag}`);
    await page
      .getByRole('button', { name: /Fold twins/ })
      .first()
      .click();
    await page.waitForTimeout(1400);
    await page.locator('.fold-card').first().scrollIntoViewIfNeeded();
    await shot(page, `app-card-${tag}`);
    await page
      .locator('.fold-card')
      .first()
      .getByRole('button', { name: /Check the pixels/ })
      .click();
    await page.locator('.lens-readout .readout-num').waitFor();
    await page.waitForTimeout(700);
    await shot(page, `app-lens-${tag}`);
    await ctx.close();
  }
}
await browser.close();
