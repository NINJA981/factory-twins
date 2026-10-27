import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = import.meta.dirname;
const repoRoot = resolve(root, '..');

/** Replaces <!--@name--> markers in the HTML pages with the pre-rendered fragments from `pnpm assets`. */
function fragments(): Plugin {
  return {
    name: 'ft-fragments',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const file = join(root, 'src/demo/fragments.json');
        if (!existsSync(file)) return html;
        const frags = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
        // The repository URL is one setting: FT_REPO_URL at build time. The default is the same
        // placeholder the extension uses (HANDOFF known issue 6); set the real one before launch.
        const repo = (process.env.FT_REPO_URL ?? 'https://github.com/factory-twins/factory-twins').replace(
          /\/$/,
          '',
        );
        return (
          html
            .replace(/<!--@([\w-]+)-->/g, (m, name: string) => frags[name] ?? m)
            .replaceAll('__REPO_URL__', repo)
            // Social cards need absolute URLs: set FT_SITE_URL (with a trailing slash) when the domain is known.
            .replaceAll('__SITE_URL__', process.env.FT_SITE_URL ?? '')
        );
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('fragments.json')) server.ws.send({ type: 'full-reload' });
    },
  };
}

/**
 * Inlines the landing page's stylesheets into its HTML, so first paint needs the HTML and nothing else
 * (one round trip fewer on a phone). The app page keeps linked, cacheable CSS. Font URLs in the CSS are
 * relative to assets/, so they are re-pointed at the page's own folder.
 */
function inlineLandingCss(): Plugin {
  return {
    name: 'ft-inline-landing-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle || resolve(ctx.filename) !== resolve(root, 'index.html')) return html;
        const bundle = ctx.bundle;
        return html.replace(
          /<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g,
          (m, file: string) => {
            const asset = bundle[file];
            if (!asset || asset.type !== 'asset') return m;
            const css = String(asset.source).replaceAll('url(../', 'url(./');
            // A stylesheet only the landing page uses has no reason to ship as its own file.
            if (/^assets\/landing-/.test(file)) Reflect.deleteProperty(bundle, file);
            return `<style>${css}</style>`;
          },
        );
      },
    },
  };
}

/** Writes dist/app/sw.js with the list of files to precache, so the web app works offline after one visit. */
function serviceWorker(): Plugin {
  let outDir = '';
  return {
    name: 'ft-sw',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).replaceAll('\\', '/'));
        }
      };
      walk(outDir);
      // Precache what the app needs; leave landing-only media and the worker itself out.
      const skip = /^(landing\/|index\.html$|og\.|poster|loop|robots\.txt$|llms\.txt$|app\/sw\.js$)|landing-/;
      const list = files.filter((f) => !skip.test(f)).sort();
      const sample = ['sample/page-1.html', 'sample/page-2.html'];
      for (const s of sample) if (!list.includes(s)) throw new Error(`missing ${s} in dist`);
      const version = createHash('sha256')
        .update(list.map((f) => f + statSync(join(outDir, f)).size).join('|'))
        .digest('hex')
        .slice(0, 12);
      const tpl = readFileSync(join(root, 'src/app/sw.template.js'), 'utf8');
      const out = tpl
        .replace('__VERSION__', version)
        // Paths are relative to the worker (dist/app/), whose scope is /app/.
        .replace('__FILES__', JSON.stringify(list.map((f) => (f === 'app/index.html' ? './' : `../${f}`))));
      writeFileSync(join(outDir, 'app/sw.js'), out);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [fragments(), inlineLandingCss(), serviceWorker()],
  resolve: {
    alias: {
      '@engine': resolve(repoRoot, 'src/core/index.ts'),
      '@copy': resolve(repoRoot, 'src/copy/strings.ts'),
      '@tokens': resolve(repoRoot, 'src/styles'),
    },
  },
  server: { host: '127.0.0.1', port: 4181, strictPort: true, fs: { allow: [repoRoot] } },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { landing: resolve(root, 'index.html'), app: resolve(root, 'app/index.html') },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
