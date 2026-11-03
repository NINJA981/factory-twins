import AxeBuilder from '@axe-core/playwright';
import { DEMO_PAGE_2, DEMO_URL, ORIGIN, expect, pill, resultBody, test } from './fixtures';

// The real extension, the real hashing path (service worker -> offscreen document -> fetch ->
// createImageBitmap -> OffscreenCanvas), on the made-up laptop stand page. This is SPEC F0 in test form.

test.describe('summary pill on the demo results page', () => {
  test('appears with the counts SPEC section 3 describes, without any click', async ({ page }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    const body = resultBody(page);
    await expect(body).toContainText('60 listings');
    await expect(body).toContainText('47 products');
    await expect(body).toContainText('6 twin groups');
    await expect(body).toContainText('up to $23 brand tax');
    // The spoken name is the visible words (WCAG 2.5.3) with commas for screen readers (AC-F4.1).
    await expect(body).toHaveAccessibleName(
      '60 listings, 47 products, 6 twin groups, up to $23 brand tax',
    );
  });

  test('never touches the store grid', async ({ page }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    const grid = await page.evaluate(() => {
      const slot = document.querySelector('.s-main-slot');
      const tagged = [...(slot?.querySelectorAll('*') ?? [])].filter((e) =>
        [...e.attributes].some((a) => a.name.startsWith('data-ft')),
      );
      return {
        children: slot?.children.length ?? 0,
        tagged: tagged.length,
        bodyHost: document.body.querySelector('factory-twins-overlay') !== null,
      };
    });
    expect(grid.children).toBe(64); // 60 tiles + 4 widgets
    expect(grid.tagged).toBe(0);
    expect(grid.bodyHost).toBe(false);
  });

  test('T and the pill toggle the ring state, and the fold button follows it', async ({ page }) => {
    await page.goto(DEMO_URL);
    const body = resultBody(page);
    await expect(body).toBeVisible({ timeout: 20_000 });
    await expect(body).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('t');
    await expect(body).toHaveAttribute('aria-pressed', 'true');
    await expect(pill(page).locator('.ft-secondary')).toContainText('Fold twins');
    await page.keyboard.press('f');
    await expect(pill(page).locator('.ft-secondary')).toContainText('Unfold twins');
    await page.keyboard.press('t');
    await expect(body).toHaveAttribute('aria-pressed', 'false');
    await body.click();
    await expect(body).toHaveAttribute('aria-pressed', 'true');
  });

  test('the shopper can hide the pill for the page', async ({ page }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    await pill(page).getByRole('button', { name: 'Hide for this page' }).click();
    await expect(pill(page)).toHaveCount(0);
  });

  test('page 2 of the same query joins page 1 (session memory)', async ({ page }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    await page.goto(DEMO_PAGE_2);
    await expect(resultBody(page)).toContainText('120 listings across 2 pages', {
      timeout: 20_000,
    });
  });

  test('degrades to the error state on a changed layout and never breaks the page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ORIGIN}/s/broken?k=laptop+stand`);
    await expect(pill(page)).toContainText("Couldn't read this page's listings", { timeout: 20_000 });
    await expect(pill(page).getByRole('link', { name: 'Report layout' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('does nothing on a URL it does not match (AC-F1.5)', async ({ page }) => {
    const response = await page.goto(`${ORIGIN}/healthz`);
    expect(response?.status()).toBe(200);
    await page.waitForTimeout(1500);
    expect(await page.locator('factory-twins-overlay').count()).toBe(0);
  });
});

test.describe('popup and options', () => {
  test('the popup counts the reads the hasher really made, all from one host (AC-F9.3)', async ({
    context,
    page,
    extensionId,
  }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    const reads = popup.getByTestId('reads');
    await expect(reads).toContainText('image reads this session, all from localhost:4817. 0 to anyone else.');
    const n = Number(/^(\d+) image reads/.exec((await reads.textContent()) ?? '')?.[1]);
    expect(n).toBe(60);
    await expect(
      popup.getByText('Factory Twins works on Amazon.com and Walmart.com search results.'),
    ).toBeVisible();
  });

  test('turning Amazon off in the popup removes the pill without a reload (AC-F10.2)', async ({
    context,
    page,
    extensionId,
  }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.getByRole('switch').first().click();
    await expect(popup.getByText('Off on Amazon')).toBeVisible();
    // Open tabs apply the change without a reload.
    await expect(pill(page)).toHaveCount(0);
    await popup.getByRole('switch').first().click();
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
  });

  test('popup and options pass an automated accessibility check', async ({ context, extensionId }) => {
    for (const path of ['popup.html', 'options.html']) {
      const p = await context.newPage();
      await p.goto(`chrome-extension://${extensionId}/${path}`);
      await p.getByRole('main').waitFor();
      const results = await new AxeBuilder({ page: p }).analyze();
      expect(results.violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
      await p.close();
    }
  });

  test('the pill passes an automated accessibility check', async ({ page }) => {
    await page.goto(DEMO_URL);
    await expect(resultBody(page)).toBeVisible({ timeout: 20_000 });
    const results = await new AxeBuilder({ page }).include('factory-twins-overlay').analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
});
