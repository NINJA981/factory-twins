import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { DEMO_URL, ORIGIN, expect, resultBody, test } from './fixtures';

// Parity: the extension and the web app are two shells over one engine. On the same results page they
// must produce the same groups, letters, badges, prices, brand tax, ladder order and Proof lens
// numbers. The web app is the built site (site/dist on :4182); the extension is the e2e build.
//
// Fixture A is the demo laptop-stand page, byte for byte: the extension gets it from the fixture
// server, the web app gets it through a route that answers its "sample" requests with the same files.
// Fixture B is the web app's own bundled sample page (downsized photos), which the fixture server
// also serves in an Amazon-shaped URL for the extension.

const APP = 'http://127.0.0.1:4182/app/';
const DEMO_DIR = resolve('tests', 'fixtures', 'demo', 'laptop-stand');

interface Card {
  letter: string;
  header: string;
  tax: string | null;
  rungs: Array<{ id: string; price: string; brand: string }>;
}
interface Snapshot {
  pill: string;
  badges: Record<string, string>;
  cards: Card[];
  lens: string[];
}

const squash = (s: string) => s.replace(/[\s,→·]+/g, ' ').trim();
const percents = (s: string) => s.match(/\d+(?:\.\d+)?%/g) ?? [];

/** The extension, read through its shadow roots. */
async function extensionSnapshot(page: Page, url: string): Promise<Snapshot> {
  await page.goto(url);
  await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
  const pill = squash(await resultBody(page).innerText());
  await page.keyboard.press('t');
  await expect(page.locator('factory-twins-tile').first()).toBeAttached();
  const badges = await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (const host of document.querySelectorAll('factory-twins-tile')) {
      const id = host.closest('[data-asin]')?.getAttribute('data-asin');
      const text = host.shadowRoot?.querySelector('.badge')?.textContent;
      if (id && text) out[id] = text.trim();
    }
    return out;
  });
  await page.keyboard.press('f');
  await expect(page.locator('factory-twins-card').first()).toBeVisible();
  await page.waitForTimeout(1500);
  const cards = await page.evaluate(() => {
    const t = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('factory-twins-card')].map((host) => {
      const root = host.shadowRoot as ShadowRoot;
      const badge = t(root.querySelector('.badge-static'));
      return {
        letter: /Twin ([A-Z])/.exec(badge)?.[1] ?? '?',
        header: t(root.querySelector('h2')),
        tax: root.querySelector('.tax') ? t(root.querySelector('.tax')) : null,
        rungs: [...root.querySelectorAll('.rung')].map((r) => ({
          id: r.getAttribute('data-id') ?? '',
          price: t(r.querySelector('.price')),
          brand: t(r.querySelector('.brand')),
        })),
      };
    });
  });
  await host(page)
    .first()
    .getByRole('button', { name: /^Check the pixels/ })
    .click();
  const readout = page.getByRole('dialog', { name: 'Check the pixels' }).locator('.ft-readout').first();
  await expect(readout.locator('.ft-readout-number')).toContainText(/%/, { timeout: 10_000 });
  const lens = percents(await readout.innerText());
  return { pill, badges, cards, lens };
}
const host = (page: Page) => page.locator('factory-twins-card');

/** The web app, after it has read the same page. */
async function appSnapshot(page: Page): Promise<Snapshot> {
  await page.getByRole('button', { name: 'Try a sample' }).first().click();
  await expect(page.locator('.tile').first()).toBeVisible({ timeout: 20_000 });
  const pill = squash((await page.locator('.pill-main').first().textContent()) ?? '');
  await page.getByRole('button', { name: /Show twins/ }).click();
  const badges = await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (const tile of document.querySelectorAll('article.tile[data-twin]')) {
      const id = tile.getAttribute('data-id');
      const text = tile.querySelector('.badge')?.textContent;
      if (id && text) out[id] = text.trim();
    }
    return out;
  });
  await page
    .getByRole('button', { name: /Fold twins/ })
    .first()
    .click();
  await expect(page.locator('.fold-card').first()).toBeVisible();
  await page.waitForTimeout(1500);
  const cards = await page.evaluate(() => {
    const t = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('.fold-card')].map((card) => ({
      letter: card.getAttribute('data-letter') ?? '?',
      header: t(card.querySelector('.fold-title')),
      tax: card.querySelector('.tax-tag') ? t(card.querySelector('.tax-tag')) : null,
      rungs: [...card.querySelectorAll('.rung')].map((r) => ({
        id: r.getAttribute('data-id') ?? '',
        price: t(r.querySelector('.rung-price')),
        brand: t(r.querySelector('.rung-brand')),
      })),
    }));
  });
  await page
    .locator('.fold-card')
    .first()
    .getByRole('button', { name: /Check the pixels/ })
    .click();
  await expect(page.locator('.lens-readout .readout-num')).toContainText(/%/, { timeout: 10_000 });
  const lens = percents(await page.locator('.lens-readout').innerText());
  return { pill, badges, cards, lens };
}

function expectSame(ext: Snapshot, app: Snapshot) {
  // Sanity first, so two empty snapshots cannot agree.
  expect(Object.keys(ext.badges).length).toBeGreaterThanOrEqual(10);
  expect(ext.cards.length).toBeGreaterThanOrEqual(4);
  expect(ext.lens.length).toBeGreaterThanOrEqual(2);
  expect(app.pill).toBe(ext.pill);
  expect(app.badges).toEqual(ext.badges);
  expect(app.cards).toEqual(ext.cards);
  expect(app.lens).toEqual(ext.lens);
}

/**
 * The web app in its own browser with service workers blocked: Playwright cannot route requests that a
 * page's service worker may handle, and fixture A needs its sample requests answered with other files.
 */
async function withApp<T>(run: (page: Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    return await run(await context.newPage());
  } finally {
    await browser.close();
  }
}

test.describe('the extension and the web app produce the same engine output', () => {
  test('fixture A: the demo laptop-stand page, byte for byte', async ({ page }) => {
    const ext = await extensionSnapshot(page, DEMO_URL);
    const web = await withApp(async (app) => {
      // Answer the web app's sample requests with the demo page and its original photos.
      await app.route('**/sample/page-1.html', (route) =>
        route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: readFileSync(resolve(DEMO_DIR, 'page.html'), 'utf8'),
        }),
      );
      let served = 0;
      await app.route('**/sample/img/*', (route) => {
        served++;
        return route.fulfill({
          contentType: 'image/jpeg',
          body: readFileSync(resolve(DEMO_DIR, 'img', basename(new URL(route.request().url()).pathname))),
        });
      });
      await app.goto(APP, { waitUntil: 'networkidle' });
      const snap = await appSnapshot(app);
      // The photos really came from the demo folder, not from the site's downsized copies.
      expect(served).toBeGreaterThanOrEqual(60);
      return snap;
    });
    expectSame(ext, web);
    expect(ext.pill).toMatch(/60 listings/);
  });

  test("fixture B: the web app's bundled sample page, read by both", async ({ page }) => {
    const ext = await extensionSnapshot(page, `${ORIGIN}/s/web-sample?k=laptop+stand`);
    const web = await withApp(async (app) => {
      await app.goto(APP, { waitUntil: 'networkidle' });
      return appSnapshot(app);
    });
    expectSame(ext, web);
  });
});
