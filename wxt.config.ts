import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import { hostPermissionPatterns } from './src/hasher/allowlist';
import { E2E_ORIGIN, contentScriptMatches, originPattern } from './src/adapters/matches';

// One codebase, two targets: Chrome MV3 (offscreen hasher) and Firefox MV3 (background-page hasher).
// `--mode e2e` builds a test-only variant that also runs on the local fixture server
// (http://localhost:4173). scripts/check-release-manifest.mjs asserts that a release build
// never contains that origin.
export default defineConfig({
  // Firefox defaults to MV2 in WXT; the product targets MV3 on both (SPEC section 11).
  manifestVersion: 3,
  // `--mode e2e` builds into .output/chrome-mv3-e2e (WXT's default mode suffix), never over the release build.
  modules: ['@wxt-dev/module-react'],
  imports: false,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  hooks: {
    // Release content scripts match the two search URLs only (AC-F1.5). The e2e build widens them to
    // the local fixture server; contentScriptMatches() is the single source of both lists.
    'build:manifestGenerated': (wxt, manifest) => {
      const e2e = wxt.config.mode === 'e2e';
      for (const script of manifest.content_scripts ?? []) {
        const file = script.js?.join(',') ?? '';
        if (file.includes('amazon')) script.matches = contentScriptMatches('amazon-us', e2e);
        if (file.includes('walmart')) script.matches = contentScriptMatches('walmart-us', e2e);
      }
    },
  },
  manifest: ({ browser, mode }) => {
    const e2e = mode === 'e2e';
    const isFirefox = browser === 'firefox';
    const fontMatches = [
      ...contentScriptMatches('amazon-us', e2e),
      ...contentScriptMatches('walmart-us', e2e),
    ];
    return {
      name: 'Factory Twins',
      description:
        'Rings search results that use the same factory photo and folds them into one price ladder. Runs on your device.',
      permissions: isFirefox ? ['storage'] : ['storage', 'offscreen'],
      host_permissions: hostPermissionPatterns({ e2e }),
      commands: {
        'ring-twins': {
          suggested_key: { default: 'Alt+Shift+T' },
          description: 'Show or hide twin rings',
        },
        'fold-twins': {
          suggested_key: { default: 'Alt+Shift+F' },
          description: 'Fold or unfold twin groups',
        },
      },
      web_accessible_resources: [
        {
          resources: ['fonts/*.woff2'],
          matches: [...new Set(fontMatches.map(originPattern))],
          ...(isFirefox ? {} : { use_dynamic_url: true }),
        },
      ],
      ...(isFirefox
        ? {
            browser_specific_settings: {
              gecko: {
                id: 'factory-twins@factory-twins',
                strict_min_version: '128.0',
                // No telemetry, no accounts, no servers: declared so AMO shows "none collected".
                data_collection_permissions: { required: ['none'] },
              },
            },
          }
        : {}),
      ...(e2e ? { name: 'Factory Twins (e2e)', description: `Test build. Also runs on ${E2E_ORIGIN}.` } : {}),
    };
  },
});
