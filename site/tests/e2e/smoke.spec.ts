import { expect, test } from '@playwright/test';

// Smoke test for the built site (dist/, served by scripts/serve-dist.mjs, which behaves like a real
// static host: real 404s, no SPA fallback). It proves the pieces a visitor and a crawler touch exist,
// have the right type, and that the two pages load clean.

const ORIGIN = 'http://127.0.0.1:4180';

const FILES: Array<[path: string, type: RegExp]> = [
  ['/', /text\/html/],
  ['/app/', /text\/html/],
  ['/app/manifest.webmanifest', /manifest\+json|json/],
  ['/app/sw.js', /javascript/],
  ['/robots.txt', /text\/plain/],
  ['/llms.txt', /text\/plain/],
  ['/sample/page-1.html', /text\/html/],
  ['/sample/page-2.html', /text\/html/],
  ['/landing/og.png', /image\/png/],
  ['/landing/loop-poster.avif', /image\/avif/],
  ['/landing/loop.mp4', /video\/mp4/],
];

test.describe('static files', () => {
  for (const [path, type] of FILES) {
    test(`${path} is served with the right type`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toMatch(type);
      expect((await res.body()).length).toBeGreaterThan(0);
    });
  }

  test('an unknown path is a real 404, and /app redirects to /app/', async ({ request }) => {
    expect((await request.get('/no-such-page/')).status()).toBe(404);
    const res = await request.get('/app', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe('/app/');
  });

  test('every icon in the manifest is served', async ({ request }) => {
    const manifest = await (await request.get('/app/manifest.webmanifest')).json();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      const res = await request.get(new URL(icon.src, `${ORIGIN}/app/`).href);
      expect(res.status(), icon.src).toBe(200);
    }
  });

  test('robots.txt and llms.txt say what the site is, with no placeholder text', async ({ request }) => {
    for (const path of ['/robots.txt', '/llms.txt']) {
      const text = await (await request.get(path)).text();
      expect(text).not.toMatch(/lorem ipsum|__[A-Z_]+__|TODO/i);
    }
  });
});

for (const [name, path, title] of [
  ['landing page', '/', /Factory Twins/],
  ['web app', '/app/', /Factory Twins web app/],
] as const) {
  test.describe(name, () => {
    test('loads clean: title, description, one h1, no console errors, no failed or foreign requests', async ({
      page,
    }) => {
      const errors: string[] = [];
      const failed: string[] = [];
      const foreign: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
      page.on('request', (r) => {
        if (!r.url().startsWith(ORIGIN) && !/^(data|blob):/.test(r.url())) foreign.push(r.url());
      });
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`${r.url()} ${r.status()}`);
      });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page).toHaveTitle(title);
      expect(
        (await page.locator('meta[name="description"]').getAttribute('content'))?.length,
      ).toBeGreaterThan(60);
      expect(await page.locator('html').getAttribute('lang')).toBe('en');
      expect(await page.locator('meta[name="viewport"]').count()).toBe(1);
      expect(await page.locator('h1').count()).toBe(1);
      expect(errors).toEqual([]);
      expect(failed).toEqual([]);
      expect(foreign).toEqual([]);
    });

    test('every same-origin link resolves, and the text has no placeholder copy', async ({
      page,
      request,
    }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
      const local = [
        ...new Set(hrefs.filter((h) => h.startsWith(ORIGIN)).map((h) => h.split('#')[0] as string)),
      ];
      for (const href of local) {
        expect((await request.get(href)).status(), href).toBe(200);
      }
      const text = await page.locator('body').innerText();
      expect(text).not.toMatch(/lorem ipsum/i);
    });
  });
}

test.describe('landing page claims (AC-W.1, AC-W.13)', () => {
  test('links to the web app from the nav, the hero, the privacy section and the install section', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const links = page.locator('a[href="app/"]');
    expect(await links.count()).toBeGreaterThanOrEqual(4);
    await expect(page.locator('nav a[href="app/"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try it in your browser, no install' })).toBeVisible();
    for (const section of ['#privacy', '#install']) {
      expect(await page.locator(`${section} a[href="app/"]`).count(), section).toBeGreaterThanOrEqual(1);
    }
    await page.getByRole('link', { name: 'Try it in your browser, no install' }).click();
    await expect(page).toHaveURL(`${ORIGIN}/app/`);
  });

  test('says the demo is made up, and has no testimonial, star count or install count', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).toContain('made up');
    expect(text).not.toMatch(
      /testimonial|\d[\d,.]*\s*(github )?stars|\d[\d,.]*\+?\s*(installs|users|downloads)/,
    );
  });
});
