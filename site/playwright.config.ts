import { defineConfig } from '@playwright/test';

// Runs against the production build (site/dist) served by scripts/serve-dist.mjs on :4180, a static
// server with real 404s and gzip, so a path that only worked through vite preview's index.html
// fallback would fail here. Build first: `pnpm build`.
//
//  - site:    landing page, smoke, accessibility, existing app checks (their own contexts)
//  - phone:   the web app flows at 375 x 812 with touch
//  - desktop: the same web app flows at 1440 x 900 with a mouse
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  projects: [
    { name: 'site', testMatch: ['site.spec.ts', 'smoke.spec.ts', 'a11y.spec.ts'] },
    {
      name: 'phone',
      testMatch: 'app.spec.ts',
      use: {
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
      },
    },
    { name: 'desktop', testMatch: 'app.spec.ts', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'node scripts/serve-dist.mjs 4180',
    url: 'http://127.0.0.1:4180/app/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
