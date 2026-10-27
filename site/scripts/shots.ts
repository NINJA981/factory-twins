// Dev helper: screenshots of the built site at 375, 768 and 1440 px, light and dark.
// Usage: pnpm preview (in another shell), then: pnpm tsx scripts/shots.ts <outDir> [path]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots';
const arg = process.argv[3] ?? 'root';
const path = arg === 'root' ? '/' : `/${arg.replace(/^\/+|\/+$/g, '')}/`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const w of [375, 768, 1440]) {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: w === 375 ? 812 : 900 },
      deviceScaleFactor: 1,
      colorScheme: scheme,
      hasTouch: w < 768,
      isMobile: w < 768,
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:4182${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const name = `${path.replaceAll('/', '_') || 'root'}-${w}-${scheme}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    await ctx.close();
  }
}
await browser.close();
