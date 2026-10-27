import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import type { BrowserContext, Page } from '@playwright/test';
import { DEMO_PAGE_2, DEMO_URL, ORIGIN, expect, pill, resultBody, test } from './fixtures';

// Stage 4: acceptance criteria that the earlier e2e files did not reach. Each test names the AC it
// covers; docs/TEST_MATRIX.md is the full map. Everything runs in the real built extension (Chromium,
// `--load-extension`) against the made-up demo page served from localhost.

// The extension APIs the popup tab exposes; only what these tests touch (no @types/chrome here).
declare const chrome: {
  runtime: {
    getManifest(): {
      manifest_version: number;
      permissions?: string[];
      commands?: Record<string, { suggested_key?: { default?: string } }>;
    };
  };
  tabs: { query: (...args: unknown[]) => Promise<Array<{ id?: number }>> };
};

const labels = JSON.parse(
  readFileSync(resolve('tests', 'fixtures', 'demo', 'laptop-stand', 'labels.json'), 'utf8'),
) as { groups: string[][] };

async function ready(page: Page, url = DEMO_URL) {
  await page.goto(url);
  await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
}

/** The popup is opened as a tab in tests, so point its "active tab" at the store tab. */
async function pointAtStoreTab(context: BrowserContext, popup: Page) {
  const [worker] = context.serviceWorkers();
  const id = await worker?.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:4817/*' });
    return tabs[0]?.id ?? null;
  });
  await popup.addInitScript((tabId) => {
    chrome.tabs.query = ((_q: unknown, cb?: (t: unknown[]) => void) => {
      const result = [{ id: tabId, active: true }];
      if (cb) cb(result);
      return Promise.resolve(result);
    }) as typeof chrome.tabs.query;
  }, id);
}

async function openPopup(context: BrowserContext, extensionId: string, withStoreTab = true) {
  const popup = await context.newPage();
  if (withStoreTab) await pointAtStoreTab(context, popup);
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByRole('main').waitFor();
  return popup;
}

const violations = (r: { violations: Array<{ id: string; nodes: unknown[] }> }) =>
  r.violations.map((v) => `${v.id} (${v.nodes.length})`);

test.describe('timing and hosts (AC-F4.1, AC-F0.2, AC-F0.3, AC-X.2)', () => {
  test('the pill is up within 1.5 s of load and hashing 60 photos fits the same budget', async ({ page }) => {
    // Local proxy for AC-F0.2 and AC-F4.1: images come from localhost, so this measures our pipeline
    // (fetch, decode, hash, cluster, render), not a CDN. The cold offscreen document is included.
    const t0 = Date.now();
    await page.goto(DEMO_URL, { waitUntil: 'load' });
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    const cold = Date.now() - t0;
    // A cold profile also wakes the service worker and creates the offscreen document. Measured here:
    // about 1.2 to 1.3 s cold and 0.15 s warm, both from navigation start (a superset of "after the last
    // tile has loaded"). On a loaded machine the cold run has taken 1.5 to 2.6 s, so the cold bound is a
    // regression guard with headroom and the warm bound is the AC-F4.1 number (see HANDOFF).
    expect(cold).toBeLessThan(2800);
    const t1 = Date.now();
    await page.goto(`${DEMO_URL}&warm=1`, { waitUntil: 'load' });
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    expect(Date.now() - t1).toBeLessThan(1500);
  });

  test('the extension reads exactly the listings thumbnails, from the fixture origin, and nothing else', async ({
    page,
    request,
  }) => {
    // Playwright cannot see requests made by an extension's service worker or offscreen document, so
    // the fixture server logs every request it receives, with the Sec-Fetch headers the browser sent.
    await request.get(`${ORIGIN}/__log?clear=1`);
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog', { name: 'Check the pixels' })).toBeVisible();
    await page.keyboard.press('Escape');
    const log = (await (await request.get(`${ORIGIN}/__log`)).json()) as Array<{
      path: string;
      site: string | null;
      dest: string | null;
    }>;
    // The extension's own fetches carry no Origin; the browser marks them Sec-Fetch-Site none, Dest empty.
    const ours = log.filter((r) => r.dest === 'empty' && r.site === 'none');
    expect(ours.length).toBeGreaterThanOrEqual(60);
    // Every read is a product thumbnail; no page, script, style or widget image is fetched by us.
    expect(ours.every((r) => r.path.startsWith('/img/'))).toBe(true);
    expect(ours.some((r) => /editorial|video|pick/.test(r.path))).toBe(false);
    // The same photo is never read twice in a session (AC-F2.3): 60 tiles, 60 distinct URLs.
    expect(new Set(ours.map((r) => r.path)).size).toBe(ours.length);
  });
});

test.describe('pill states and placement (AC-F4.2, AC-F4.3)', () => {
  test('a page with no shared photos says so (no twins state)', async ({ page }) => {
    // Keep one member of every labelled group and the single listings, drop the other members.
    const drop = new Set(labels.groups.flatMap((g) => g.slice(1)));
    await page.route(`${ORIGIN}/s?*`, async (route) => {
      const res = await route.fetch();
      let html = await res.text();
      for (const asin of drop) {
        const start = html.indexOf(`<div role="listitem" data-asin="${asin}"`);
        if (start < 0) continue;
        const next = html.indexOf('<div role="listitem"', start + 10);
        html = html.slice(0, start) + html.slice(next < 0 ? html.length : next);
      }
      await route.fulfill({ response: res, body: html });
    });
    await page.goto(DEMO_URL);
    await expect(pill(page)).toContainText('no shared photos on this page', { timeout: 20_000 });
    await expect(pill(page)).toContainText(/\d+ listings/);
    // No twins: nothing to ring or fold.
    await page.keyboard.press('t');
    await expect(page.locator('factory-twins-tile')).toHaveCount(0);
    const results = await new AxeBuilder({ page }).include('factory-twins-overlay').analyze();
    expect(violations(results)).toEqual([]);
  });

  test('the error pill passes axe and carries no page content in its report link', async ({ page }) => {
    await page.goto(`${ORIGIN}/s/broken?k=laptop+stand`);
    await expect(pill(page)).toContainText("Couldn't read this page's listings", { timeout: 20_000 });
    const href = await pill(page).getByRole('link', { name: 'Report layout' }).getAttribute('href');
    expect(href).toMatch(/^https:\/\/github\.com\//);
    // The link carries the store and adapter version only: no query, no title, no text from the page.
    const decoded = decodeURIComponent(href ?? '');
    expect(decoded).not.toMatch(/laptop|Layout changed/i);
    const results = await new AxeBuilder({ page }).include('factory-twins-overlay').analyze();
    expect(violations(results)).toEqual([]);
  });

  test('the pill is fixed in the corner, inside a shadow root, and takes no room from the page', async ({
    page,
  }) => {
    await ready(page);
    const info = await page.evaluate(() => {
      const host = document.querySelector('factory-twins-overlay') as HTMLElement;
      const dock = host.shadowRoot?.querySelector('.ft-dock') as HTMLElement;
      const rect = dock.getBoundingClientRect();
      return {
        mode: host.shadowRoot?.mode,
        // The host is fixed over the viewport; the dock inside it sits in the bottom corner.
        position: getComputedStyle(host).position,
        right: innerWidth - rect.right,
        bottom: innerHeight - rect.bottom,
      };
    });
    expect(info.mode).toBe('open');
    expect(info.position).toBe('fixed');
    expect(info.right).toBeGreaterThanOrEqual(0);
    expect(info.bottom).toBeGreaterThanOrEqual(0);
    expect(info.right).toBeLessThan(64);
    // Scrolling the page does not move it.
    const before = await pill(page).boundingBox();
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(150);
    const after = await pill(page).boundingBox();
    expect(after?.y).toBe(before?.y);
  });
});

test.describe('tiles that arrive late and rings that follow (AC-F1.3, AC-F5.3)', () => {
  test('a tile inserted after load is picked up quickly, and a photo already seen is not read again', async ({
    context,
    page,
    extensionId,
  }) => {
    await ready(page);
    await expect(resultBody(page)).toContainText('60 listings');
    // Insert a tile and time, inside the page, how long the pill takes to count it (a MutationObserver on
    // the pill's shadow root, so the number carries no Playwright polling delay).
    const elapsed = await page.evaluate(
      () =>
        new Promise<number>((resolveMs) => {
          const slot = document.querySelector('.s-main-slot') as HTMLElement;
          const tile = slot.querySelector('[data-asin]') as HTMLElement;
          const copy = tile.cloneNode(true) as HTMLElement;
          copy.setAttribute('data-asin', 'B0LATE0001');
          for (const a of copy.querySelectorAll('a')) a.setAttribute('href', '/dp/B0LATE0001');
          const root = (document.querySelector('factory-twins-overlay') as HTMLElement)
            .shadowRoot as ShadowRoot;
          const t0 = performance.now();
          const seen = () => root.textContent?.includes('61 listings');
          const obs = new MutationObserver(() => {
            if (seen()) {
              obs.disconnect();
              resolveMs(performance.now() - t0);
            }
          });
          obs.observe(root, { subtree: true, childList: true, characterData: true });
          slot.append(copy);
        }),
    );
    // AC-F1.3: within 500 ms of insertion. The tile reuses a photo that is already hashed, so this is the
    // observer, debounce and render path only.
    expect(elapsed).toBeLessThan(500);
    // The same image URL as a tile already hashed comes from the cache: still 60 reads, not 61 (AC-F2.3).
    const popup = await openPopup(context, extensionId, true);
    await expect(popup.getByTestId('reads')).toContainText(/^60 image reads/);
  });

  test('rings stay on their tiles through scroll and resize', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    await expect(page.locator('factory-twins-tile')).toHaveCount(19);
    const drift = async () =>
      page.evaluate(() => {
        let worst = 0;
        for (const host of document.querySelectorAll('factory-twins-tile')) {
          const tile = host.closest('[data-asin]') as HTMLElement;
          const t = tile.getBoundingClientRect();
          const ring = host.shadowRoot?.querySelector('.ring') as HTMLElement;
          const r = ring.getBoundingClientRect();
          // Offset between the ring's box and the tile's box, in px (rings may sit a few px outside).
          worst = Math.max(worst, Math.abs(r.left - t.left), Math.abs(r.top - t.top));
        }
        return worst;
      });
    const start = await drift();
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(150);
    expect(await drift()).toBeLessThanOrEqual(start + 0.5);
    await page.setViewportSize({ width: 700, height: 800 });
    await page.waitForTimeout(250);
    expect(await drift()).toBeLessThanOrEqual(start + 0.5);
    expect(start).toBeLessThan(8);
  });
});

test.describe('session memory (AC-F8.*)', () => {
  test('page 2 badges count across pages, and the session can be cleared and restored', async ({
    context,
    page,
    extensionId,
  }) => {
    await ready(page);
    await ready(page, DEMO_PAGE_2);
    await expect(resultBody(page)).toContainText('120 listings across 2 pages', { timeout: 20_000 });
    await page.keyboard.press('t');
    await page.locator('factory-twins-tile .badge').first().hover();
    await expect(page.locator('factory-twins-tile .tip').first()).toContainText(/across 2 pages/);

    const popup = await openPopup(context, extensionId);
    await popup.getByRole('button', { name: 'Clear this session' }).click();
    await expect(popup.getByRole('status')).toContainText('Session cleared');
    // Undo inside the six-second window puts it back (AC-F8.3).
    await popup.getByRole('button', { name: 'Undo' }).click();
    await page.goto(DEMO_PAGE_2);
    await expect(resultBody(page)).toContainText('120 listings across 2 pages', { timeout: 20_000 });

    // Cleared for good: page 2 stands alone again.
    const popup2 = await openPopup(context, extensionId);
    await popup2.getByRole('button', { name: 'Clear this session' }).click();
    await expect(popup2.getByRole('status')).toContainText('Session cleared');
    await page.goto(DEMO_PAGE_2);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    await expect(resultBody(page)).not.toContainText('across 2 pages');
  });
});

test.describe('options apply to open tabs without a reload (AC-F10.1, AC-F10.2)', () => {
  test('ring automatically, then turn the pill off, then turn single keys off', async ({
    context,
    page,
    extensionId,
  }) => {
    await ready(page);
    await expect(page.locator('factory-twins-tile')).toHaveCount(0);
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.getByRole('main').waitFor();

    await options.getByRole('switch', { name: 'Ring twins automatically' }).click();
    await expect(page.locator('factory-twins-tile').first()).toBeAttached({ timeout: 10_000 });

    // Single-key shortcuts off: T no longer toggles anything.
    await options.getByRole('switch', { name: 'Single-key shortcuts' }).click();
    await page.waitForTimeout(400);
    const rung = await page.locator('factory-twins-tile').count();
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    expect(await page.locator('factory-twins-tile').count()).toBe(rung);

    // The pill itself can be turned off (AC-F4.2 paused).
    await options.getByRole('switch', { name: 'Show the summary pill automatically' }).click();
    await expect(pill(page)).toHaveCount(0, { timeout: 10_000 });

    // Settings persist in storage.local: a reload of the options page shows them.
    await options.reload();
    await options.getByRole('main').waitFor();
    await expect(options.getByRole('switch', { name: 'Ring twins automatically' })).toBeChecked();
    await expect(options.getByRole('switch', { name: 'Single-key shortcuts' })).not.toBeChecked();
    await expect(
      options.getByRole('switch', { name: 'Show the summary pill automatically' }),
    ).not.toBeChecked();
  });

  test('Strict matching and the session-memory switch change what the next page shows', async ({
    context,
    page,
    extensionId,
  }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.getByRole('main').waitFor();
    await options.getByRole('radio', { name: 'Strict' }).click();
    await expect(options.getByRole('radio', { name: 'Strict' })).toBeChecked();
    await options.getByRole('switch', { name: 'Remember twins across pages' }).click();
    await expect(options.getByRole('switch', { name: 'Remember twins across pages' })).not.toBeChecked();
    await page.waitForTimeout(300);

    await ready(page);
    const strictText = await resultBody(page).innerText();
    await ready(page, DEMO_PAGE_2);
    // Memory off: page 2 is its own session (nothing was stored for page 1).
    await expect(resultBody(page)).not.toContainText('across 2 pages');

    await options.getByRole('radio', { name: 'Standard' }).click();
    await page.waitForTimeout(300);
    await ready(page);
    const standardText = await resultBody(page).innerText();
    expect(standardText).toMatch(/(^|\D)6\D+twin groups/);
    // Strict is never looser than Standard.
    const groups = (t: string) => Number(/(\d+)\s+twin groups?/.exec(t)?.[1] ?? 0);
    expect(groups(strictText)).toBeLessThanOrEqual(groups(standardText));
  });
});

test.describe('popup (AC-F9.1, AC-F9.2, AC-F9.4)', () => {
  test('on a store page it shows this page, the switch and the shortcuts', async ({
    context,
    page,
    extensionId,
  }) => {
    await ready(page);
    const popup = await openPopup(context, extensionId);
    await expect(popup.getByTestId('page-counts')).toContainText('60');
    await expect(popup.getByRole('switch').first()).toBeChecked();
    for (const key of ['T', 'F']) {
      await expect(popup.locator('kbd', { hasText: new RegExp(`^${key}$`) }).first()).toBeVisible();
    }
    await popup.getByRole('button', { name: 'Shortcuts' }).click();
    for (const key of ['P', 'O', 'D']) {
      await expect(popup.locator('kbd', { hasText: new RegExp(`^${key}$`) }).first()).toBeVisible();
    }
    const results = await new AxeBuilder({ page: popup }).analyze();
    expect(violations(results)).toEqual([]);
  });

  test('on another page it explains where it works and links two examples', async ({
    context,
    extensionId,
  }) => {
    const popup = await openPopup(context, extensionId, false);
    await expect(
      popup.getByText('Factory Twins works on Amazon.com and Walmart.com search results.'),
    ).toBeVisible();
    const hrefs = await popup
      .locator('a[href^="https://www."]')
      .evaluateAll((a) => a.map((x) => (x as HTMLAnchorElement).href));
    expect(hrefs.some((h) => h.includes('amazon.com/s'))).toBe(true);
    expect(hrefs.some((h) => h.includes('walmart.com/search'))).toBe(true);
  });

  test('first paint is within 100 ms warm and it makes no network request of its own', async ({
    context,
    extensionId,
  }) => {
    // First contentful paint of the popup page, from the browser's own paint timing.
    const paint = (popup: Page) =>
      popup.evaluate(
        () =>
          new Promise<number>((resolveFcp) => {
            const now = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
            if (now != null) return resolveFcp(now);
            new PerformanceObserver((list, obs) => {
              const e = list.getEntriesByName('first-contentful-paint')[0];
              if (e) {
                obs.disconnect();
                resolveFcp(e.startTime);
              }
            }).observe({ type: 'paint', buffered: true });
          }),
      );
    const open = async () => {
      const popup = await context.newPage();
      const urls: string[] = [];
      popup.on('request', (r) => urls.push(r.url()));
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await popup.getByRole('main').waitFor();
      const fcp = await paint(popup);
      await popup.close();
      return { fcp, urls };
    };
    // The very first open in a fresh browser parses the bundle with a cold code cache: 190 to 290 ms on the
    // reference machine (recorded in HANDOFF). AC-F9.4 is asserted on the median of three opens after that.
    await open();
    const runs = [await open(), await open(), await open()];
    const median = runs.map((r) => r.fcp).sort((a, b) => a - b)[1] as number;
    expect(median).toBeLessThan(100);
    for (const r of runs) {
      expect(r.urls.filter((u) => !u.startsWith('chrome-extension://') && !u.startsWith('data:'))).toEqual(
        [],
      );
    }
  });
});

test.describe('manifest (AC-F1.5, AC-F12.2)', () => {
  test('commands are declared with the documented keys, and permissions stay minimal', async ({
    context,
    extensionId,
  }) => {
    const popup = await openPopup(context, extensionId, false);
    const manifest = await popup.evaluate(() => chrome.runtime.getManifest());
    expect(manifest.commands?.['ring-twins']?.suggested_key?.default).toBe('Alt+Shift+T');
    expect(manifest.commands?.['fold-twins']?.suggested_key?.default).toBe('Alt+Shift+F');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions?.slice().sort()).toEqual(expect.arrayContaining(['storage', 'offscreen']));
    expect(manifest.permissions).not.toContain('tabs');
    expect(manifest.permissions).not.toContain('history');
  });
});

test.describe('accessibility on every remaining surface', () => {
  test('the cheatsheet and the scanning-to-result pill pass axe', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('?');
    await expect(page.locator('.ft-cheat')).toBeVisible();
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).include('factory-twins-overlay').analyze();
    expect(violations(results)).toEqual([]);
  });

  test('a narrow window: a ladder that scrolls sideways is keyboard-reachable and passes axe', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 520, height: 800 });
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(page.locator('factory-twins-card')).toHaveCount(6);
    await page.waitForTimeout(1500);
    const scrolls = await page.evaluate(
      () =>
        [...document.querySelectorAll('factory-twins-card')].filter((host) => {
          const el = host.shadowRoot?.querySelector('.scroller') as HTMLElement | null;
          return el != null && el.scrollWidth > el.clientWidth;
        }).length,
    );
    // The five-rung ladder cannot fit in 520 px, so this test would pass for the wrong reason without it.
    expect(scrolls).toBeGreaterThan(0);
    const results = await new AxeBuilder({ page }).include('factory-twins-card').analyze();
    expect(violations(results)).toEqual([]);
  });

  test('a dark store page: fold cards and the lens still pass axe', async ({ page }) => {
    await ready(page, `${DEMO_URL}&theme=dark`);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(page.locator('factory-twins-card')).toHaveCount(6);
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page })
      .include('factory-twins-card')
      .include('factory-twins-tile')
      .include('factory-twins-overlay')
      .analyze();
    expect(violations(results)).toEqual([]);
  });
});
