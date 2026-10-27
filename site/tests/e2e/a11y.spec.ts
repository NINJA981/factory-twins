import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { photo, press, trio } from './helpers';

// axe-core on every surface of the site: the landing page and every state of the web app, on a phone
// (375 x 812, touch) and a desktop (1440 x 900), in light and dark, with no rule disabled.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function scan(page: Page) {
  // Let finite animations land first: axe measures contrast on the frame it sees, and a number rolling in
  // from opacity 0 (the Proof stack readout, 400 ms) is not a contrast failure once it has arrived.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

const VIEWPORTS = {
  phone: { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true },
  desktop: { viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
} as const;

async function context(browser: Browser, device: keyof typeof VIEWPORTS, scheme: 'light' | 'dark') {
  return browser.newContext({ ...VIEWPORTS[device], colorScheme: scheme });
}

for (const device of ['phone', 'desktop'] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`${device}, ${scheme}`, () => {
      const tap = (loc: Parameters<typeof press>[0]) =>
        press(loc, { project: { name: device } } as Parameters<typeof press>[1]);

      test('landing page: at rest, folded, and with the Proof stack open', async ({ browser }) => {
        const ctx = await context(browser, device, scheme);
        const page = await ctx.newPage();
        await page.goto('/', { waitUntil: 'networkidle' });
        expect(await scan(page)).toEqual([]);
        if (device === 'desktop') {
          await page.keyboard.press('f');
          await expect(page.locator('#demo .grid')).toHaveAttribute('data-state', 'folded');
          await page.waitForTimeout(1500);
          expect(await scan(page)).toEqual([]);
        }
        await page.getByRole('button', { name: 'Stack them' }).scrollIntoViewIfNeeded();
        await page.getByRole('button', { name: 'Stack them' }).click();
        await expect(page.locator('#readout-twin')).toBeVisible();
        expect(await scan(page)).toEqual([]);
        await ctx.close();
      });

      test('web app: empty, loading, results, rings, folded and the lens', async ({ browser }) => {
        const ctx = await context(browser, device, scheme);
        const page = await ctx.newPage();
        await page.goto('/app/', { waitUntil: 'networkidle' });
        expect(await scan(page), 'empty').toEqual([]);

        await tap(page.getByRole('button', { name: 'Try a sample' }).first());
        await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
        expect(await scan(page), 'results').toEqual([]);

        await tap(page.getByRole('button', { name: /Show twins/ }));
        await expect(page.locator('#stage')).toHaveAttribute('data-rings', 'true');
        expect(await scan(page), 'rings').toEqual([]);

        await tap(page.getByRole('button', { name: /Fold twins/ }).first());
        await expect(page.locator('.fold-card:visible')).toHaveCount(6);
        await page.waitForTimeout(1500);
        expect(await scan(page), 'folded').toEqual([]);

        await tap(
          page
            .locator('.fold-card')
            .first()
            .getByRole('button', { name: /Check the pixels/ }),
        );
        await expect(page.locator('dialog.lens[open]')).toBeVisible();
        expect(await scan(page), 'lens, onion skin').toEqual([]);
        await tap(page.getByRole('radio', { name: /^Difference/ }));
        expect(await scan(page), 'lens, difference').toEqual([]);
        await ctx.close();
      });

      test('web app: picked photos with price fields, and the error state', async ({ browser }) => {
        const ctx = await context(browser, device, scheme);
        const page = await ctx.newPage();
        await page.goto('/app/', { waitUntil: 'networkidle' });
        await page.locator('#file-input').setInputFiles(await trio());
        await expect(page.locator('.tile')).toHaveCount(3, { timeout: 20_000 });
        // Scroll the row to the middle so the fixed summary pill does not sit over the remove buttons: axe
        // measures what is actually clickable at the current scroll position.
        await page
          .locator('.tile')
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'center' }));
        expect(await scan(page), 'picked photos').toEqual([]);

        await page.getByRole('button', { name: 'Clear all' }).click();
        await page.locator('#file-input').setInputFiles({
          name: 'broken.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('not a picture'),
        });
        await expect(page.locator('[data-state-view="error"]')).toBeVisible({ timeout: 20_000 });
        expect(await scan(page), 'error').toEqual([]);
        await ctx.close();
      });
    });
  }
}

test('web app: the loading state, held open by a slow sample page', async ({ browser }) => {
  // Service workers blocked so the route below sees the request instead of the precache.
  const ctx = await browser.newContext({ ...VIEWPORTS.phone, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/sample/page-1.html', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/app/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Try a sample' }).first().tap();
  await expect(page.locator('[data-state-view="loading"]')).toBeVisible();
  expect(await scan(page)).toEqual([]);
  release();
  await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
  await ctx.close();
});

test('web app: reduced motion keeps every state accessible', async ({ browser }) => {
  const ctx = await browser.newContext({ ...VIEWPORTS.desktop, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/app/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Try a sample' }).first().click();
  await expect(page.locator('.tile')).toHaveCount(60, { timeout: 20_000 });
  await page.keyboard.press('f');
  await expect(page.locator('.fold-card:visible')).toHaveCount(6);
  expect(await scan(page)).toEqual([]);
  // A different seed from the one the picker flows use, to be sure the scan is not tied to one photo.
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page
    .locator('#file-input')
    .setInputFiles({ name: 'x.jpg', mimeType: 'image/jpeg', buffer: await photo(21) });
  await expect(page.locator('.tile')).toHaveCount(1, { timeout: 20_000 });
  expect(await scan(page)).toEqual([]);
  await ctx.close();
});
