import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

const ORIGIN = 'http://127.0.0.1:4180';

/** Collects every request the page makes, so a test can prove there is no third-party traffic. */
function trackRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  return urls;
}
const foreign = (urls: string[]) =>
  urls.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));

/** A synthetic product photo: a few shapes on white. A different seed makes a different picture. */
async function photo(seed: number, opts: { scale?: number; quality?: number } = {}) {
  const shapes = [
    `<circle cx="${60 + ((seed * 23) % 120)}" cy="${70 + ((seed * 31) % 90)}" r="${40 + ((seed * 7) % 30)}" fill="#2a5db0"/>`,
    `<rect x="${30 + ((seed * 41) % 100)}" y="${120 + ((seed * 13) % 60)}" width="${90 + ((seed * 5) % 60)}" height="${50 + ((seed * 9) % 50)}" fill="#d33"/>`,
    `<polygon points="${20 + ((seed * 17) % 80)},200 ${220 - ((seed * 11) % 60)},${40 + ((seed * 19) % 60)} 240,${230 - ((seed * 3) % 40)}" fill="#3b9"/>`,
  ].join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#fff"/>${shapes}</svg>`;
  let img = sharp(Buffer.from(svg));
  if (opts.scale) img = img.resize(Math.round(300 * opts.scale));
  return img.jpeg({ quality: opts.quality ?? 90 }).toBuffer();
}

test.describe('landing page', () => {
  test('hero paints the H1, with no console errors and no third-party requests', async ({ page }) => {
    const urls = trackRequests(page);
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Five brands\.\s*One photo\./);
    await expect(page.getByRole('link', { name: /Try it in your browser, no install/ })).toBeVisible();
    expect(errors).toEqual([]);
    expect(foreign(urls)).toEqual([]);
  });

  for (const w of [375, 768, 1440]) {
    test(`no horizontal scroll at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/', { waitUntil: 'networkidle' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    });
  }

  test('pressing F folds the hero demo', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const grid = page.locator('#demo .grid');
    await expect(grid).toHaveAttribute('data-state', 'idle');
    await page.keyboard.press('f');
    await expect(grid).toHaveAttribute('data-state', 'folded');
    await expect(page.locator('#demo .fold-card').first()).toBeVisible();
  });

  test('reduced motion: the proof stack still works', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Stack them' }).click();
    await expect(page.locator('#readout-twin')).toBeVisible();
    await ctx.close();
  });

  test('JavaScript off: the folded end state is in the HTML', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#demo .fold-card').first()).toBeAttached();
    await ctx.close();
  });

  test('fold cards lay out like the extension: ladder fits, bracket at the right edge or dropped', async ({
    browser,
  }) => {
    for (const [w, h, bracket] of [
      [1440, 900, true],
      [768, 900, true],
      [375, 812, false],
    ] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto('/', { waitUntil: 'networkidle' });
      // Reduced motion boots the demo folded: the five-rung hero card and the four-rung brand-tax card.
      for (const sel of ['#demo .fold-card', '.card-crop .fold-card']) {
        const m = await page
          .locator(sel)
          .first()
          .evaluate((el) => {
            const sc = el.querySelector('.ladder-scroll') as HTMLElement;
            const br = el.querySelector<HTMLElement>('.bracket');
            const card = el.getBoundingClientRect();
            const b = br?.getBoundingClientRect();
            return {
              overflow: sc.scrollWidth - sc.clientWidth,
              bracket: !!br && getComputedStyle(br).display !== 'none' && (b?.width ?? 0) > 0,
              gap: b ? card.right - b.right : null,
            };
          });
        expect(m.bracket, `${sel} at ${w}`).toBe(bracket);
        // Wide enough for the bracket means wide enough for every rung too.
        if (bracket) {
          expect(m.overflow, `${sel} at ${w}`).toBeLessThanOrEqual(0);
          expect(m.gap!, `${sel} at ${w}`).toBeLessThan(40);
        }
      }
      await ctx.close();
    }
  });

  test('the real product beat shows the extension screenshot, light or dark', async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme });
      const page = await ctx.newPage();
      await page.goto('/');
      const img = page.locator('.real-shot img');
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(736);
      expect(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).toContain(
        `landing/real/card-768-${colorScheme}.avif`,
      );
      await ctx.close();
    }
  });

  test('the social recording and its poster exist and are within budget', async ({ request }) => {
    const poster = await request.get('/landing/loop-poster.avif');
    expect(poster.ok()).toBe(true);
    expect((await poster.body()).length).toBeLessThanOrEqual(80 * 1024);
    const video = await request.get('/landing/loop.mp4');
    expect(video.ok()).toBe(true);
    expect((await video.body()).length).toBeLessThanOrEqual(1.2 * 1024 * 1024);
  });
});

test.describe('web app', () => {
  test('empty state: privacy line, three intake paths, try a sample', async ({ page }) => {
    const urls = trackRequests(page);
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Runs entirely in your browser. Nothing is uploaded.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pick photos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Paste an image' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try a sample' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No photos yet' })).toBeVisible();
    expect(foreign(urls)).toEqual([]);
  });

  test('sample results page: the real engine groups twins, fold and Proof lens work', async ({ page }) => {
    const urls = trackRequests(page);
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Try a sample' }).first().click();
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-status]')).toContainText(/twin groups among 60 listings/);
    await expect(page.locator('.pill')).toBeVisible();
    await page.getByRole('button', { name: /Show twins/ }).click();
    await expect(page.locator('#stage')).toHaveAttribute('data-rings', 'true');
    await page
      .getByRole('button', { name: /Fold twins/ })
      .first()
      .click();
    const card = page.locator('.fold-card').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.tax-tag')).toBeVisible();
    await card.getByRole('button', { name: /Check the pixels/ }).click();
    await expect(page.locator('dialog.lens[open]')).toBeVisible();
    await expect(page.locator('.lens-readout')).toContainText(/\d/);
    expect(foreign(urls)).toEqual([]);
  });

  test('Proof lens is touch-draggable on a phone', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Try a sample' }).first().click();
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
    await page
      .getByRole('button', { name: /Fold twins/ })
      .first()
      .tap();
    await page
      .locator('.fold-card')
      .first()
      .getByRole('button', { name: /Check the pixels/ })
      .tap();
    const view = page.locator('.lens-view');
    await expect(view).toBeVisible();
    const slider = page.locator('[data-lens="blend"]');
    const before = await slider.inputValue();
    const box = (await view.boundingBox())!;
    const cdp = await ctx.newCDPSession(page);
    const y = box.y + box.height / 2;
    const pt = (x: number) => [{ x, y }];
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: pt(box.x + box.width * 0.5),
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: pt(box.x + box.width * (0.5 + i * 0.05)),
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => slider.inputValue()).not.toBe(before);
    await ctx.close();
  });

  test('picked photos: a resized re-save groups with its original, a different photo does not', async ({
    page,
  }) => {
    const urls = trackRequests(page);
    await page.goto('/app/', { waitUntil: 'networkidle' });
    const files = [
      { name: 'a-original.jpg', mimeType: 'image/jpeg', buffer: await photo(3) },
      { name: 'b-resaved.jpg', mimeType: 'image/jpeg', buffer: await photo(3, { scale: 0.7, quality: 55 }) },
      { name: 'c-different.jpg', mimeType: 'image/jpeg', buffer: await photo(11) },
    ];
    await page.locator('#file-input').setInputFiles(files);
    await expect(page.locator('[data-status]')).toContainText(/1 twin group among 3 photos/, {
      timeout: 20_000,
    });
    await expect(page.locator('.tile')).toHaveCount(3);
    const prices = page.locator('input[data-field="price"]');
    await prices.nth(0).fill('34.99');
    await prices.nth(1).fill('11.99');
    await page
      .getByRole('button', { name: /Fold twins/ })
      .first()
      .click();
    await expect(page.locator('.fold-card .tax-tag')).toContainText(/23/);
    expect(foreign(urls)).toEqual([]);
  });

  test('error state: a file that is not an image is explained, nothing is uploaded', async ({ page }) => {
    const urls = trackRequests(page);
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await page.locator('#file-input').setInputFiles({
      name: 'broken.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('not an image at all'),
    });
    await expect(page.locator('[data-state-view="error"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-state-view="error"]')).toContainText(/Nothing was uploaded/);
    await expect(page.getByRole('button', { name: 'Try a sample' }).first()).toBeVisible();
    expect(foreign(urls)).toEqual([]);
  });

  test('loading state shows while the sample is checked', async ({ page }) => {
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Try a sample' }).first().click();
    await expect(page.locator('[data-state-view="loading"]')).toBeVisible();
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
  });

  test('touch targets are at least 44 px at 375 px', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Try a sample' }).first().click();
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, [role="radio"]',
      )) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
        if (el.closest('[hidden]') || el.closest('dialog:not([open])')) continue;
        if (el.matches('.skip')) continue;
        if (el.matches('a') && cs.display === 'inline') continue; // inline text links
        if (r.width < 43.5 || r.height < 43.5)
          out.push(
            `${el.tagName.toLowerCase()}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`,
          );
      }
      return out;
    });
    expect(small).toEqual([]);
    await ctx.close();
  });

  test('works offline after the first load, and is installable', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/app/', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-offline]')).toContainText(/Saved on this device/, { timeout: 20_000 });
    const manifest = await page.evaluate(async () => {
      const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
      return (await fetch(href)).json();
    });
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByText('Runs entirely in your browser. Nothing is uploaded.')).toBeVisible();
    await page.getByRole('button', { name: 'Try a sample' }).first().click();
    await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-status]')).toContainText(/twin groups among 60 listings/);
    await ctx.close();
  });

  for (const w of [375, 768, 1440]) {
    test(`no horizontal scroll at ${w}px with results`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/app/', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Try a sample' }).first().click();
      await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
      await page
        .getByRole('button', { name: /Fold twins/ })
        .first()
        .click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    });
  }
});
