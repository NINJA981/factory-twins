import { defineConfig } from '@playwright/test';

// e2e runs the built `--mode e2e` extension in Chromium against the local fixture server
// (scripts/serve-fixtures.mjs on http://localhost:4817). Run with `pnpm test:e2e`.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'node scripts/serve-fixtures.mjs',
      url: 'http://localhost:4817/healthz',
      reuseExistingServer: true,
      timeout: 20_000,
    },
    {
      // The built web app (site/dist), for the parity test. Build it first: `pnpm --dir site build`.
      command: 'node site/scripts/serve-dist.mjs 4182',
      url: 'http://127.0.0.1:4182/app/',
      reuseExistingServer: true,
      timeout: 20_000,
    },
  ],
});
