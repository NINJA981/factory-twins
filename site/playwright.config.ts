import { defineConfig } from '@playwright/test';

// Runs against the production build served by `vite preview` on :4180. Build first: `pnpm build`.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4180/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
