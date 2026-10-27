import { expect, test, type Page } from '@playwright/test';
import { photo, press, strays, trio, watch } from './helpers';

// The web app at /app/, run twice by playwright.config.ts: as a phone (375 x 812, touch) and as a
// desktop (1440 x 900, mouse). Each flow also asserts that the page made no request that is not a GET of
// a static file from its own origin (SPEC AC-W.2).

const PRIVACY = 'Runs entirely in your browser. Nothing is uploaded.';

async function open(page: Page) {
  await page.goto('/app/', { waitUntil: 'networkidle' });
  await expect(page.getByText(PRIVACY)).toBeVisible();
}

const sampleButton = (page: Page) => page.getByRole('button', { name: 'Try a sample' }).first();
const foldButton = (page: Page) => page.getByRole('button', { name: /Fold twins/ }).first();

test.describe('sample flow', () => {
  test('empty, loading, results, rings, fold, ladder, lens', async ({ page }, info) => {
    const seen = watch(page);
    await open(page);
    await expect(page.getByRole('heading', { name: 'No photos yet' })).toBeVisible();
    await press(sampleButton(page), info);
    await expect(page.locator('[data-state-view="loading"]')).toBeVisible();
    await expect(page.locator('[data-loading-line]')).toContainText(/Checking \d+ photos/);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    await expect(page.locator('[data-status]')).toContainText('6 twin groups among 60 listings');
    await expect(page.locator('.pill')).toContainText('60 listings');
    await expect(page.locator('.pill')).toContainText('6 twin groups');
    // The sample says what it is.
    await expect(page.locator('[data-results-note]')).toContainText(/made up/i);

    await press(page.getByRole('button', { name: /Show twins/ }), info);
    await expect(page.locator('#stage')).toHaveAttribute('data-rings', 'true');
    await expect(page.locator('article.tile[data-twin]')).toHaveCount(19);
    const labels = await page.locator('article.tile[data-twin] .badge').allTextContents();
    expect(labels.every((t) => /^Twin [A-F] ×\d+$/.test(t.trim()))).toBe(true);

    await press(foldButton(page), info);
    await expect(page.locator('.fold-card:visible')).toHaveCount(6);
    const card = page.locator('.fold-card').first();
    await expect(card.locator('.fold-title')).toHaveText(/^These \d+ listings use the same photo$/);
    await expect(card.locator('.tax-tag')).toContainText(/Brand tax \+\$\d+\.\d\d/);
    expect(await card.locator('li.rung').count()).toBeGreaterThanOrEqual(2);
    await expect(card.locator('.chip-established')).toHaveText('Most established');

    await press(card.getByRole('button', { name: /Check the pixels/ }), info);
    await expect(page.locator('dialog.lens[open]')).toBeVisible();
    await expect(page.locator('.lens-readout .readout-num')).toContainText(/\d+(\.\d)?%/);
    await expect(page.locator('.lens-readout')).toContainText(/% of pixels differ|No pixel differs/);

    expect(strays(seen.requests)).toEqual([]);
    expect(seen.sockets).toEqual([]);
  });

  test('unfolding restores the grid and the lens returns focus to its trigger', async ({ page }, info) => {
    await open(page);
    await press(sampleButton(page), info);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    const tilesBefore = await page
      .locator('.tile')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
    await press(foldButton(page), info);
    await expect(page.locator('.fold-card:visible')).toHaveCount(6);
    const opener = page
      .locator('.fold-card')
      .first()
      .getByRole('button', { name: /Check the pixels/ });
    await press(opener, info);
    await expect(page.locator('dialog.lens[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.lens[open]')).toHaveCount(0);
    await expect(opener).toBeFocused();
    await press(page.getByRole('button', { name: /Unfold twins/ }).first(), info);
    await expect(page.locator('.fold-card:visible')).toHaveCount(0);
    const tilesAfter = await page
      .locator('.tile')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
    expect(tilesAfter).toEqual(tilesBefore);
  });
});

test.describe('pick, paste and drop', () => {
  test('picking photos: twins found, price and brand give the ladder and the brand tax', async ({
    page,
  }, info) => {
    const seen = watch(page);
    await open(page);
    await page.locator('#file-input').setInputFiles(await trio());
    await expect(page.locator('[data-status]')).toContainText(/1 twin group among 3 photos/, {
      timeout: 20_000,
    });
    await expect(page.locator('.tile')).toHaveCount(3);
    const prices = page.locator('input[data-field="price"]');
    await prices.nth(0).fill('34.99');
    await prices.nth(0).blur();
    await prices.nth(1).fill('11.99');
    await prices.nth(1).blur();
    await page.locator('input[data-field="brand"]').nth(0).fill('Mulberry');
    await page.locator('input[data-field="brand"]').nth(0).blur();
    await press(foldButton(page), info);
    const card = page.locator('.fold-card:visible');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.tax-tag')).toContainText('+$23.00');
    const rungs = await card.locator('li.rung .rung-price').allTextContents();
    expect(rungs.map((t) => t.replace(/\s+/g, ''))).toEqual(['$11.99', '$34.99']);
    expect(strays(seen.requests)).toEqual([]);
  });

  test('a photo and a re-save of it group; a different photo does not (three seeds)', async ({ page }) => {
    await open(page);
    const files = [
      { name: 'one.png', mimeType: 'image/png', buffer: await photo(5, { format: 'png' }) },
      { name: 'one-small.jpg', mimeType: 'image/jpeg', buffer: await photo(5, { scale: 0.6, quality: 60 }) },
      { name: 'two.jpg', mimeType: 'image/jpeg', buffer: await photo(8) },
      { name: 'three.jpg', mimeType: 'image/jpeg', buffer: await photo(14) },
    ];
    await page.locator('#file-input').setInputFiles(files);
    await expect(page.locator('[data-status]')).toContainText(/1 twin group among 4 photos/, {
      timeout: 20_000,
    });
    await expect(page.locator('article.tile[data-twin]')).toHaveCount(2);
  });

  test('pasting an image (Ctrl+V) adds it', async ({ page }) => {
    const seen = watch(page);
    await open(page);
    const b64 = (await photo(3, { format: 'png' })).toString('base64');
    await page.evaluate(async (data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'clip.png', { type: 'image/png' }));
      document.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
    }, b64);
    await expect(page.locator('.tile')).toHaveCount(1, { timeout: 20_000 });
    await expect(page.locator('[data-status]')).toContainText(/No two of these 1 photos share a photo/);
    // A second paste of the same picture joins the first as a twin.
    await page.evaluate(async (data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'clip2.png', { type: 'image/png' }));
      document.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
    }, b64);
    await expect(page.locator('[data-status]')).toContainText(/1 twin group among 2 photos/, {
      timeout: 20_000,
    });
    expect(strays(seen.requests)).toEqual([]);
  });

  test('the Paste an image button reads the clipboard when allowed', async ({ page, context }, info) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    const b64 = (await photo(9, { format: 'png' })).toString('base64');
    await page.evaluate(async (data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': new Blob([bytes], { type: 'image/png' }) }),
      ]);
    }, b64);
    await press(page.getByRole('button', { name: 'Paste an image' }), info);
    await expect(page.locator('.tile')).toHaveCount(1, { timeout: 20_000 });
  });

  test('with nothing on the clipboard the button explains what to do', async ({ page, context }, info) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await page.evaluate(() => navigator.clipboard.writeText('just words'));
    await press(page.getByRole('button', { name: 'Paste an image' }), info);
    await expect(page.locator('[data-notice]')).toContainText(/no image|Copy an image first/i);
    await expect(page.locator('.tile')).toHaveCount(0);
  });

  test('dropping files adds them', async ({ page }) => {
    const seen = watch(page);
    await open(page);
    const [a, b] = await Promise.all([photo(3), photo(3, { scale: 0.8, quality: 70 })]);
    await page.evaluate(
      async ([x, y]) => {
        const file = (data: string, name: string) =>
          new File([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], name, { type: 'image/jpeg' });
        const dt = new DataTransfer();
        dt.items.add(file(x as string, 'dropped-1.jpg'));
        dt.items.add(file(y as string, 'dropped-2.jpg'));
        for (const type of ['dragenter', 'dragover', 'drop']) {
          window.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
        }
      },
      [a.toString('base64'), b.toString('base64')],
    );
    await expect(page.locator('[data-status]')).toContainText(/1 twin group among 2 photos/, {
      timeout: 20_000,
    });
    await expect(page.locator('[data-drop]')).toBeHidden();
    expect(strays(seen.requests)).toEqual([]);
  });

  test('more than 60 photos: the first 60 are checked and the notice says so', async ({ page }) => {
    await open(page);
    const tiny = await photo(2, { scale: 0.2 });
    const files = Array.from({ length: 63 }, (_, i) => ({
      name: `p${String(i).padStart(2, '0')}.jpg`,
      mimeType: 'image/jpeg',
      buffer: tiny,
    }));
    await page.locator('#file-input').setInputFiles(files);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 30_000 });
    await expect(page.locator('[data-notice]')).toContainText('Only the first 60 photos are checked');
  });

  test('a photo can be removed, and Clear all returns to the empty state', async ({ page }, info) => {
    await open(page);
    await page.locator('#file-input').setInputFiles(await trio());
    await expect(page.locator('.tile')).toHaveCount(3, { timeout: 20_000 });
    await press(page.getByRole('button', { name: /^Remove c-different/ }), info);
    await expect(page.locator('.tile')).toHaveCount(2);
    await press(page.getByRole('button', { name: 'Clear all' }), info);
    await expect(page.getByRole('heading', { name: 'No photos yet' })).toBeVisible();
  });

  test('a file that is not an image gets an explanation and a way forward', async ({ page }) => {
    const seen = watch(page);
    await open(page);
    await page.locator('#file-input').setInputFiles({
      name: 'broken.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('this is text, not a picture'),
    });
    const error = page.locator('[data-state-view="error"]');
    await expect(error).toBeVisible({ timeout: 20_000 });
    await expect(error).toContainText('Nothing was uploaded.');
    await expect(error.getByRole('button', { name: 'Try a sample' })).toBeVisible();
    expect(strays(seen.requests)).toEqual([]);
  });
});

test.describe('offline and installable', () => {
  test('after one visit the app, the sample and picking all work with the network off', async ({
    page,
    context,
  }, info) => {
    await open(page);
    await expect(page.locator('[data-offline]')).toContainText(/Saved on this device/, { timeout: 20_000 });

    // Installable: a valid manifest and icons that exist.
    const manifest = await page.evaluate(async () => {
      const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href ?? '';
      const m = await (await fetch(href)).json();
      const icons: Array<{ src: string; sizes: string; purpose: string; status: number; w: number }> = [];
      for (const i of m.icons) {
        const res = await fetch(new URL(i.src, href).href);
        const bmp = await createImageBitmap(await res.blob());
        icons.push({ src: i.src, sizes: i.sizes, purpose: i.purpose, status: res.status, w: bmp.width });
      }
      return { display: m.display, start: m.start_url, scope: m.scope, name: m.name, icons };
    });
    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons.map((i) => `${i.purpose}:${i.w}`).sort()).toEqual([
      'any:192',
      'any:512',
      'maskable:512',
    ]);
    expect(manifest.icons.every((i) => i.status === 200 && String(i.w) === i.sizes.split('x')[0])).toBe(true);

    // The service worker controls the page and has precached the sample and its photos.
    await page.reload({ waitUntil: 'networkidle' });
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/app/');
      const names = await caches.keys();
      const cache = await caches.open(names[0] as string);
      const keys = (await cache.keys()).map((r) => new URL(r.url).pathname);
      return { active: reg?.active?.state, controlled: navigator.serviceWorker.controller != null, keys };
    });
    expect(sw.active).toBe('activated');
    expect(sw.controlled).toBe(true);
    expect(sw.keys).toContain('/app/');
    expect(sw.keys).toContain('/sample/page-1.html');
    expect(sw.keys.filter((k) => k.startsWith('/sample/img/')).length).toBeGreaterThanOrEqual(60);

    await context.setOffline(true);
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(r.url()));
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByText(PRIVACY)).toBeVisible();
    await press(sampleButton(page), info);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    await expect(page.locator('[data-status]')).toContainText('6 twin groups among 60 listings');
    await press(foldButton(page), info);
    await expect(page.locator('.fold-card:visible')).toHaveCount(6);

    await page.reload({ waitUntil: 'load' });
    await page.locator('#file-input').setInputFiles(await trio());
    await expect(page.locator('[data-status]')).toContainText(/1 twin group among 3 photos/, {
      timeout: 20_000,
    });
    // Nothing tried to reach the network and failed: every file came from the precache.
    expect(failed).toEqual([]);
    await context.setOffline(false);
  });

  test('the service worker has no network code of its own beyond passing a request through', async ({
    request,
  }) => {
    const res = await request.get('/app/sw.js');
    expect(res.ok()).toBe(true);
    const src = await res.text();
    expect(src).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket|importScripts|https?:\/\//);
    // The only fetch is the pass-through of the request being handled.
    expect(src.match(/\bfetch\(/g)).toEqual(['fetch(']);
    expect(src).toContain('fetch(req)');
  });
});

test.describe('layout', () => {
  test('no horizontal scroll with results, folded and with the lens open', async ({ page }, info) => {
    await open(page);
    await press(sampleButton(page), info);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await press(foldButton(page), info);
    await expect(page.locator('.fold-card:visible')).toHaveCount(6);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await press(
      page
        .locator('.fold-card')
        .first()
        .getByRole('button', { name: /Check the pixels/ }),
      info,
    );
    await expect(page.locator('dialog.lens[open]')).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  test('every control is at least 44 x 44 px on the phone, and focusable by keyboard on the desktop', async ({
    page,
  }, info) => {
    await open(page);
    await sampleButton(page).click();
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    if (info.project.name === 'phone') {
      const small = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input, select')) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
          if (el.closest('[hidden]') || el.closest('dialog:not([open])') || el.matches('.skip')) continue;
          if (el.matches('a') && cs.display === 'inline') continue;
          if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName}.${el.className}`);
        }
        return out;
      });
      expect(small).toEqual([]);
    } else {
      await page.keyboard.press('t');
      await expect(page.locator('#stage')).toHaveAttribute('data-rings', 'true');
      await page.keyboard.press('f');
      await expect(page.locator('.fold-card:visible')).toHaveCount(6);
      await page.keyboard.press('f');
      await expect(page.locator('.fold-card:visible')).toHaveCount(0);
    }
  });
});

test.describe('same layout as the extension', () => {
  test('three rungs fit, the bracket sits at the right (dropped on a phone), no pill line starts with a divider', async ({
    page,
  }, info) => {
    await open(page);
    await press(sampleButton(page), info);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    await press(foldButton(page), info);
    const card = page.locator('.fold-card').first();
    await expect(card).toBeVisible();
    const m = await card.evaluate((el) => {
      const sc = el.querySelector('.ladder-scroll') as HTMLElement;
      const br = el.querySelector<HTMLElement>('.bracket');
      const b = br?.getBoundingClientRect();
      return {
        rungs: el.querySelectorAll('li.rung').length,
        overflow: sc.scrollWidth - sc.clientWidth,
        bracket: !!br && getComputedStyle(br).display !== 'none' && (b?.width ?? 0) > 0,
        gap: b ? el.getBoundingClientRect().right - b.right : null,
      };
    });
    expect(m.rungs).toBe(3);
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(m.bracket).toBe(info.project.name !== 'phone');
    if (m.bracket) expect(m.gap!).toBeLessThan(40);
    // The pill wraps on a phone. Whatever segment starts a line must have its divider clipped away.
    const dangling = await page.locator('.pill-row').evaluate((row) => {
      const clip = (row.parentElement as HTMLElement).getBoundingClientRect();
      let top = -1;
      let bad = 0;
      for (const seg of row.querySelectorAll<HTMLElement>('.seg')) {
        const first = seg.offsetTop !== top;
        top = seg.offsetTop;
        const div = (seg.querySelector('.div') as HTMLElement).getBoundingClientRect();
        if (first && div.right > clip.left + 0.5) bad++;
        if (!first && div.right <= clip.left) bad++;
      }
      return bad;
    });
    expect(dangling).toBe(0);
  });

  test('the Proof lens shows its number without scrolling, with the photo pickers as chips', async ({
    page,
  }, info) => {
    await open(page);
    await press(sampleButton(page), info);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    await press(foldButton(page), info);
    await press(
      page
        .locator('.fold-card')
        .first()
        .getByRole('button', { name: /Check the pixels/ }),
      info,
    );
    const num = page.locator('.lens-readout .readout-num');
    await expect(num).toContainText('%');
    const box = (await num.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const top = page.getByRole('group', { name: 'Top photo' });
    await expect(top.locator('.lens-chip')).toHaveCount(3);
    await expect(top.locator('.lens-chip[aria-pressed="true"]')).toHaveCount(1);
    // Picking the second listing as the top photo measures that pair instead.
    const before = await num.textContent();
    await press(top.locator('.lens-chip').nth(1), info);
    await expect(top.locator('.lens-chip').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => num.textContent()).not.toBe(before);
  });
});

test.describe('lens interaction', () => {
  test('the blend moves with a finger on a phone and with arrow keys on a desktop', async ({
    page,
    context,
  }, info) => {
    await open(page);
    await press(sampleButton(page), info);
    await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
    await press(foldButton(page), info);
    await press(
      page
        .locator('.fold-card')
        .first()
        .getByRole('button', { name: /Check the pixels/ }),
      info,
    );
    const slider = page.locator('[data-lens="blend"]');
    const before = await slider.inputValue();
    if (info.project.name === 'phone') {
      const box = (await page.locator('.lens-view').boundingBox())!;
      const cdp = await context.newCDPSession(page);
      const y = box.y + box.height / 2;
      const at = (f: number) => [{ x: box.x + box.width * f, y }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0.5) });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(0.5 + i * 0.05) });
        // Paced like a finger. Eight moves in one burst are read as a fling, and Chromium then swallows the
        // next tap as "stop the scroll", which would break the mode-switch taps below.
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await slider.focus();
      await page.keyboard.press('ArrowRight');
    }
    await expect.poll(() => slider.inputValue()).not.toBe(before);
    // Difference mode turns the slider off; onion skin turns it back on.
    await press(page.getByRole('radio', { name: /^Difference/ }), info);
    await expect(slider).toBeDisabled();
    await press(page.getByRole('radio', { name: /^Onion skin/ }), info);
    await expect(slider).toBeEnabled();
  });
});
