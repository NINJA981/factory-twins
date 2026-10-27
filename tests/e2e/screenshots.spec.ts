import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { DEMO_URL, ORIGIN, expect, pill, resultBody, test } from './fixtures';

// Screenshots for visual review (docs/screenshots). Opt in with FT_SHOTS=1, because it takes a
// minute and writes files: `FT_SHOTS=1 pnpm test:e2e screenshots`. Every shot is the real built
// extension on the made-up demo page, at 375, 768 and 1440 px, light and dark.

// Extension globals exist only inside the pages and the service worker, not in this Node file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const OUT = join(process.cwd(), 'docs', 'screenshots');
const SIZES = [
  { name: '375', width: 375, height: 760 },
  { name: '768', width: 768, height: 900 },
  { name: '1440', width: 1440, height: 900 },
] as const;
const SCHEMES = ['light', 'dark'] as const;

test.skip(!process.env.FT_SHOTS, 'set FT_SHOTS=1 to write screenshots');
test.setTimeout(240_000);

mkdirSync(OUT, { recursive: true });

const url = (scheme: string) => `${DEMO_URL}${scheme === 'dark' ? '&theme=dark' : ''}`;

async function settle(page: Page, ms = 1300) {
  await page.waitForTimeout(ms);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

async function ready(page: Page, scheme: string) {
  await page.goto(url(scheme));
  await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
}

for (const scheme of SCHEMES) {
  for (const size of SIZES) {
    test(`store page ${size.name} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: size.width, height: size.height });
      await ready(page, scheme);
      await settle(page, 300);
      await shot(page, `01-pill-${size.name}-${scheme}`);

      await page.keyboard.press('t');
      await page
        .locator('factory-twins-tile')
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await settle(page, 300);
      await shot(page, `02-rings-${size.name}-${scheme}`);

      // Close-up of a ring and its badge tooltip.
      const badge = page.locator('factory-twins-tile .badge').first();
      await badge.hover();
      await settle(page, 800);
      const tileBox = await page
        .locator('factory-twins-tile')
        .first()
        .evaluate((el) => {
          const r = (el.parentElement ?? el).getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });
      await page.screenshot({
        path: join(OUT, `02b-badge-hover-${size.name}-${scheme}.png`),
        clip: {
          x: Math.max(0, tileBox.x - 16),
          y: Math.max(0, tileBox.y - 16),
          width: Math.min(size.width - Math.max(0, tileBox.x - 16), tileBox.width + 32),
          height: Math.min(size.height - Math.max(0, tileBox.y - 16), tileBox.height + 140),
        },
      });
      await page.mouse.move(2, 2);

      await page.keyboard.press('f');
      await settle(page);
      await shot(page, `03-folded-${size.name}-${scheme}`);
      await page
        .locator('factory-twins-card')
        .first()
        .screenshot({ path: join(OUT, `03b-card-${size.name}-${scheme}.png`) });

      await page.keyboard.press('p');
      await settle(page, 900);
      await shot(page, `04-lens-onion-${size.name}-${scheme}`);

      await page.keyboard.press('d');
      await settle(page, 900);
      await shot(page, `05-lens-difference-${size.name}-${scheme}`);
    });
  }
}

for (const scheme of SCHEMES) {
  test(`pill states, cheatsheet and fold frames ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Error state on a page whose layout the adapter cannot read.
    await page.goto(`${ORIGIN}/s/broken?k=laptop+stand${scheme === 'dark' ? '&theme=dark' : ''}`);
    await expect(pill(page)).toContainText("Couldn't read", { timeout: 20_000 });
    await settle(page, 300);
    await page.screenshot({
      path: join(OUT, `10-pill-error-${scheme}.png`),
      clip: { x: 760, y: 780, width: 680, height: 120 },
    });

    // Cheatsheet over the result pill.
    await ready(page, scheme);
    await page.keyboard.press('t');
    await page.keyboard.press('?');
    await settle(page, 300);
    await page.screenshot({
      path: join(OUT, `09-cheatsheet-${scheme}.png`),
      clip: { x: 760, y: 440, width: 680, height: 460 },
    });
    await page.keyboard.press('?');

    // Fold frames: pause every animation straight after the key press and step the clock.
    await page.keyboard.press('f');
    // document.getAnimations() skips shadow trees, so gather from every shadow root as well.
    const GATHER = `(() => {
      const out = [...document.getAnimations()];
      for (const el of document.querySelectorAll('*')) if (el.shadowRoot) out.push(...el.shadowRoot.getAnimations());
      return out;
    })()`;
    await page.evaluate(
      `(() => { window.__ftAnims = ${GATHER}; for (const a of window.__ftAnims) a.pause(); })()`,
    );
    const dir = join(OUT, 'fold-frames', scheme);
    mkdirSync(dir, { recursive: true });
    const times = [0, 80, 160, 240, 320, 440, 560, 680, 820, 1000];
    for (const [i, t] of times.entries()) {
      await page.evaluate((ms) => {
        const list = (window as unknown as { __ftAnims: Animation[] }).__ftAnims;
        for (const a of list) {
          const timing = a.effect?.getComputedTiming();
          a.currentTime = Math.min(ms, timing ? (timing.endTime as number) : ms);
        }
      }, t);
      await page.waitForTimeout(60);
      await page.screenshot({ path: join(dir, `f${String(i).padStart(2, '0')}-${t}ms.png`) });
    }
  });
}

async function fakeActiveTab(context: BrowserContext, page: Page, popup: Page) {
  // The popup is opened as a tab here, so the "active tab" would be the popup itself. Point it at the store tab.
  const [worker] = context.serviceWorkers();
  const id = await worker?.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:4817/*' });
    return tabs[0]?.id ?? null;
  });
  void page;
  await popup.addInitScript((tabId) => {
    const real = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = (q: unknown, cb?: (t: unknown[]) => void) => {
      void real;
      const result = [{ id: tabId, active: true }];
      if (cb) cb(result);
      return Promise.resolve(result);
    };
  }, id);
}

for (const scheme of SCHEMES) {
  test(`popup and options ${scheme}`, async ({ context, page, extensionId }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await ready(page, scheme);
    await page.keyboard.press('t');

    // Popup on a search page.
    const popup = await context.newPage();
    await popup.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
    await popup.setViewportSize({ width: 360, height: 640 });
    await fakeActiveTab(context, page, popup);
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.getByRole('main').waitFor();
    await popup.waitForTimeout(600);
    await popup.locator('main').screenshot({ path: join(OUT, `06-popup-page-${scheme}.png`) });
    await popup.close();

    // Popup on another page.
    const other = await context.newPage();
    await other.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
    await other.setViewportSize({ width: 360, height: 640 });
    await other.goto(`chrome-extension://${extensionId}/popup.html`);
    await other.getByRole('main').waitFor();
    await other.waitForTimeout(600);
    await other.locator('main').screenshot({ path: join(OUT, `07-popup-empty-${scheme}.png`) });
    await other.close();

    for (const size of SIZES) {
      const opts = await context.newPage();
      await opts.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
      await opts.setViewportSize({ width: size.width, height: size.name === '1440' ? 1100 : 1400 });
      await opts.goto(`chrome-extension://${extensionId}/options.html`);
      await opts.getByRole('main').waitFor();
      await opts.waitForTimeout(500);
      await opts.screenshot({ path: join(OUT, `08-options-${size.name}-${scheme}.png`) });
      await opts.close();
    }
  });
}
