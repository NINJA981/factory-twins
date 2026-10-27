import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, test as base, type BrowserContext, type Page } from '@playwright/test';

// Loads the `--mode e2e` build of the extension into a fresh Chromium profile. Extensions need the
// full browser, so this uses the `chromium` channel (new headless) rather than the headless shell.

export const EXTENSION_DIR = resolve('.output', 'chrome-mv3-e2e');
export const ORIGIN = 'http://localhost:4817';
export const DEMO_URL = `${ORIGIN}/s?k=laptop+stand`;
export const DEMO_PAGE_2 = `${ORIGIN}/s?k=laptop+stand&page=2`;

interface Fixtures {
  context: BrowserContext;
  extensionId: string;
  page: Page;
}

export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    const profile = mkdtempSync(join(tmpdir(), 'ft-e2e-'));
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await use(context);
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await use(new URL(worker.url()).host);
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';

/** The pill lives in a shadow root; Playwright locators pierce open shadow roots. */
export const pill = (page: Page) => page.locator('[data-testid="ft-pill"]');

/** The finished result: the scanning pill shares `ft-pill`, only the result has a body button. */
export const resultBody = (page: Page) => page.locator('[data-testid="ft-pill"] .ft-pill-body');
