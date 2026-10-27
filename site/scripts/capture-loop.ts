// Records the 8-second loop and its AVIF poster from the live hero demo on the built landing page, so the
// recording is the page itself (pill, rings, fold, unfold), not a mock-up. Deterministic enough to re-run.
// Usage: pnpm build, node scripts/serve-dist.mjs (other shell), then: pnpm loop (also writes landing/og.png)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = import.meta.dirname;
const BASE = process.env.SITE_URL ?? 'http://127.0.0.1:4182';
const outDir = join(root, '..', 'public', 'landing');
const tmp = join(root, '..', '.vite', 'loop-tmp');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

// Social card: the hero at 1200 x 630, light theme, once the marker circle has drawn.
{
  const c = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2600);
  const png = await p.screenshot();
  await sharp(png).png({ palette: true, quality: 80, effort: 10 }).toFile(join(outDir, 'og.png'));
  await c.close();
}

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  recordVideo: { dir: tmp, size: { width: 1440, height: 1200 } },
});
const page = await ctx.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => scrollTo(0, 0));
const box = (await page.locator('#demo').boundingBox())!;
const t0 = Date.now();
const at = async (ms: number) => page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
await at(2600); // marker circle draws after load
await page.screenshot({
  path: join(tmp, 'poster.png'),
  clip: { x: box.x, y: box.y, width: box.width, height: box.height },
});
await at(3000);
await page.keyboard.press('f'); // fold
await at(6000);
await page.keyboard.press('f'); // unfold, so the loop closes on the start state
await at(8200);
await ctx.close();
await browser.close();

const webm = join(tmp, readdirSync(tmp).find((f) => f.endsWith('.webm'))!);
const w = Math.round(box.width) & ~1;
const h = Math.round(box.height) & ~1;
const x = Math.round(box.x);
const y = Math.round(box.y);
execFileSync(
  'ffmpeg',
  [
    '-y', '-loglevel', 'error', '-i', webm,
    '-vf', `crop=${w}:${h}:${x}:${y},scale=720:-2:flags=lanczos,fps=24`,
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart',
    join(outDir, 'loop.mp4'),
  ],
  { stdio: 'inherit' },
);
const poster = await sharp(join(tmp, 'poster.png')).resize({ width: 720 }).avif({ quality: 42, effort: 6 }).toBuffer();
await sharp(poster).toFile(join(outDir, 'loop-poster.avif'));
const meta = await sharp(poster).metadata();
console.log(JSON.stringify({ video: statSync(join(outDir, 'loop.mp4')).size, poster: poster.length, w: meta.width, h: meta.height }));
rmSync(tmp, { recursive: true, force: true });
