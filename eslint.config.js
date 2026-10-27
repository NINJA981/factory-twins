import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.output/**',
      '.wxt/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'tests/fixtures/**',
      'public/**',
      'site/dist/**',
      'site/node_modules/**',
      'site/test-results/**',
      'site/public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // User data and keys are never logged (studio rule). Diagnostics go through src/util/log.ts.
      'no-console': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: [
      'scripts/**',
      'tests/**',
      '*.config.{js,ts}',
      'eslint.config.js',
      'site/scripts/**',
      'site/tests/**',
      'site/*.config.ts',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
  {
    // The site's DOM entry points look up elements that the static HTML guarantees, and its dev
    // scripts drive Chromium through untyped page.evaluate callbacks. Neither ships to users as logic.
    files: ['site/src/**/*.ts', 'site/scripts/**', 'site/tests/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['site/scripts/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // The web app's service worker template runs in a ServiceWorkerGlobalScope; `__FILES__` is
    // replaced with the precache list at build time (site/vite.config.ts).
    files: ['site/src/app/sw.template.js'],
    languageOptions: { globals: { ...globals.serviceworker, __FILES__: 'readonly' } },
  },
  {
    // Playwright fixtures: the first argument must be an object pattern and the callback is named `use`.
    files: ['tests/e2e/**', 'site/tests/e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off', 'no-empty-pattern': 'off' },
  },
  prettier,
);
