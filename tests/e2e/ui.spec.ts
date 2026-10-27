import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DEMO_URL, expect, pill, resultBody, test } from './fixtures';

// The product UI on the made-up demo page, in the real built extension: rings, fold, Proof lens,
// keyboard paths, reduced motion, theme, layout shift. (SPEC F5, F6, F7, F12, X.3, X.4.)

async function ready(page: Page, url = DEMO_URL) {
  await page.goto(url);
  await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
}

/** The store's grid as the store wrote it, with nothing of ours in it. */
const gridHtml = (page: Page) =>
  page.evaluate(() => {
    const clone = document.querySelector('.s-main-slot')?.cloneNode(true) as Element;
    clone.querySelectorAll('factory-twins-tile, factory-twins-card').forEach((n) => n.remove());
    return clone.outerHTML;
  });

const tiles = (page: Page) => page.locator('factory-twins-tile');
const cards = (page: Page) => page.locator('factory-twins-card');

test.describe('rings and badges (AC-F5.*)', () => {
  test('T rings every twin with a lettered badge, and T again removes it all at once', async ({ page }) => {
    await ready(page);
    const before = await gridHtml(page);
    await page.keyboard.press('t');
    await expect(tiles(page)).toHaveCount(19); // 5 + 4 + 3 + 3 + 2 + 2 labelled members
    const labels = await page.locator('factory-twins-tile .badge').allTextContents();
    expect(labels.every((t) => /^Twin [A-F] ×\d+$/.test(t))).toBe(true);
    // Rings carry a pattern as well as a colour.
    const patterns = await page
      .locator('factory-twins-tile .ring')
      .evaluateAll((els) => new Set(els.map((e) => e.getAttribute('data-pattern'))).size);
    expect(patterns).toBeGreaterThanOrEqual(4);
    await page.keyboard.press('t');
    await expect(tiles(page)).toHaveCount(0);
    expect(await gridHtml(page)).toBe(before);
  });

  test('hovering a badge says what it means and outlines the others in its group (AC-F5.4)', async ({
    page,
  }) => {
    await ready(page);
    await page.keyboard.press('t');
    const badge = page.locator('factory-twins-tile .badge').first();
    await badge.hover();
    await expect(page.locator('factory-twins-tile .tip').first()).toBeVisible();
    await expect(page.locator('factory-twins-tile .tip').first()).toContainText(/Same photo as \d+ other/);
    await expect(page.locator('factory-twins-tile .ring[data-active]').first()).toBeVisible();
  });
});

test.describe('fold twins (AC-F6.*)', () => {
  test('F folds each group into a card with a price ladder, and unfolding restores the grid exactly', async ({
    page,
  }) => {
    await ready(page);
    const before = await gridHtml(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(6);
    const first = cards(page).first();
    await expect(first.locator('h2')).toHaveText(/^These \d+ listings use the same photo$/, {
      timeout: 5000,
    });
    await expect(first.locator('.tax')).toContainText(/Brand tax \+\$\d+\.\d\d/, { timeout: 5000 });
    await expect(first.locator('.rung')).not.toHaveCount(0);
    await expect(first.locator('.tag[data-strong]')).toHaveText('Most established');
    // Keyboard-started fold: focus lands on the first card's title.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.shadowRoot?.activeElement?.tagName ?? ''), {
        timeout: 5000,
      })
      .toBe('H2');
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(0, { timeout: 5000 });
    await page.keyboard.press('t');
    await expect(tiles(page)).toHaveCount(0);
    expect(await gridHtml(page)).toBe(before);
  });

  test('pressing F again in the middle of the fold turns it around (AC-F6.8)', async ({ page }) => {
    await ready(page);
    const before = await gridHtml(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await page.waitForTimeout(250);
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(0, { timeout: 5000 });
    await page.keyboard.press('t');
    expect(await gridHtml(page)).toBe(before);
  });

  test('reduced motion: no flying photos, just a short crossfade (AC-F6.8)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(6);
    expect(await page.locator('.ft-ghost').count()).toBe(0);
    await page.waitForTimeout(400);
    const opacity = await cards(page)
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });

  test('rungs link to the listings', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(6);
    const hrefs = await cards(page)
      .first()
      .locator('a.rung')
      .evaluateAll((a) => a.map((x) => (x as HTMLAnchorElement).href));
    expect(hrefs.length).toBeGreaterThanOrEqual(2);
    expect(hrefs.every((h) => /\/dp\/B0/.test(h))).toBe(true);
  });
});

test.describe('Proof lens (AC-F7.*)', () => {
  test('P opens it, D cancels to black, Esc closes it', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('p');
    const dialog = page.getByRole('dialog', { name: 'Check the pixels' });
    await expect(dialog).toBeVisible();
    // The number is computed in the hasher context.
    await expect(dialog.locator('.ft-readout-number')).toContainText(/\d+(\.\d)?%\s*identical/, {
      timeout: 10_000,
    });
    await expect(dialog.getByText(/% of pixels differ|No pixel differs/)).toBeVisible();

    await page.keyboard.press('d');
    await expect(dialog.getByRole('button', { name: /^Difference/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('.ft-slider')).toBeDisabled();
    await page.keyboard.press('o');
    await expect(dialog.getByRole('button', { name: /^Onion skin/ })).toHaveAttribute('aria-pressed', 'true');

    // Arrows move the blend by 5%, Shift by 25% (AC-F7.2).
    const slider = dialog.locator('.ft-slider');
    await slider.focus();
    const start = Number(await slider.inputValue());
    await page.keyboard.press('ArrowLeft');
    expect(Number(await slider.inputValue())).toBe(start - 5);
    await page.keyboard.press('Shift+ArrowLeft');
    expect(Number(await slider.inputValue())).toBe(Math.max(0, start - 30));

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('focus stays inside the dialog and goes back where it came from', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    const badge = page.locator('factory-twins-tile .badge').first();
    await badge.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Check the pixels' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press('Tab');
      const inside = await dialog.evaluate((d) => {
        const root = d.getRootNode() as ShadowRoot;
        return d.contains(root.activeElement);
      });
      expect(inside).toBe(true);
    }
    await page.getByRole('button', { name: /^Close/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(badge).toBeFocused();
  });

  test('the lens opens from a fold card too (Check the pixels)', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(6);
    await cards(page)
      .first()
      .getByRole('button', { name: /^Check the pixels/ })
      .click();
    await expect(page.getByRole('dialog', { name: 'Check the pixels' })).toBeVisible();
  });
});

test.describe('keyboard, theme and layout', () => {
  test('? shows the shortcut list above the pill and Esc closes it', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('?');
    await expect(page.getByText('Fold or unfold twins')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Fold or unfold twins')).toHaveCount(0);
  });

  test('every pill control has a visible focus ring (AC-F12.3)', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    const controls = pill(page).locator('button');
    const n = await controls.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < n; i++) {
      await controls.nth(i).focus();
      const ring = await controls.nth(i).evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
    }
  });

  test('Esc on the focused pill hides it for the page (AC-F4.4)', async ({ page }) => {
    await ready(page);
    await resultBody(page).focus();
    await page.keyboard.press('Escape');
    await expect(pill(page)).toHaveCount(0);
  });

  test('the overlay follows the store page, not the browser (AC-X.4)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await ready(page, `${DEMO_URL}&theme=dark`);
    const theme = await page.evaluate(() =>
      document.querySelector('factory-twins-overlay')?.getAttribute('data-theme'),
    );
    expect(theme).toBe('dark');
  });

  test('nothing we render shifts the page (zero layout shift)', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>)
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await ready(page);
    await page.waitForTimeout(800);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    // The only shift is our own fixed pill growing from "Checking…" to its result (about 0.004), far
    // under the 0.05 limit; no store element moves (see the grid test in extension.spec.ts).
    expect(cls).toBeLessThan(0.01);
  });

  test('the fold card and the lens pass an automated accessibility check', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('t');
    await page.keyboard.press('f');
    await expect(cards(page)).toHaveCount(6);
    await page.waitForTimeout(1500);
    let results = await new AxeBuilder({ page })
      .include('factory-twins-card')
      .include('factory-twins-tile')
      .analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(600);
    results = await new AxeBuilder({ page }).include('factory-twins-overlay').analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
});
