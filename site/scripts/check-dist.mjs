// Fails the build when dist/ breaks a rule of the launch brief: bundle budgets (bible 11.3), no third-party
// hosts, no WebGL code in the initial graph, poster and recording within budget, and a service worker
// that precaches the whole web app. Run by `pnpm build`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = join(import.meta.dirname, '..', 'dist');
const problems = [];
const notes = [];
const fail = (m) => problems.push(m);

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const rel = (p) => relative(dist, p).replaceAll('\\', '/');
const files = walk(dist);
const gz = (p) => gzipSync(readFileSync(p)).length;
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

// 1. Initial JS of each page: the entry plus what it modulepreloads, gzip.
const BUDGET_JS = 120 * 1024;
for (const page of ['index.html', 'app/index.html']) {
  const html = readFileSync(join(dist, page), 'utf8');
  const base = join(dist, page, '..');
  const srcs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+\.js)"/g)].map((m) => join(base, m[1]));
  const total = [...new Set(srcs)].reduce((n, f) => n + gz(f), 0);
  notes.push(`${page}: initial JS ${kb(total)} gzip (budget ${kb(BUDGET_JS)})`);
  if (total > BUDGET_JS) fail(`${page}: initial JS ${kb(total)} > ${kb(BUDGET_JS)}`);
}

// 2. No WebGL or 3D library anywhere (the landing uses CSS 3D only; section 11.3 allows 3D, we ship none).
for (const f of files.filter((p) => /\.(js|html|css)$/.test(p))) {
  const text = readFileSync(f, 'utf8');
  if (/getContext\(\s*['"](?:webgl2?|experimental-webgl)['"]|THREE\.|new\s+WebGLRenderer/.test(text)) fail(`${rel(f)}: WebGL code found`);
}

// 3. Third-party hosts. Anchors to the repository are allowed; nothing may be loaded from elsewhere.
// walmart.com and localhost appear as strings inside the engine's store adapters (URL matching), never as requests.
const ALLOWED_HOSTS = new Set(['www.w3.org', 'github.com', 'www.amazon.com', 'amazon.com', 'm.media-amazon.com', 'www.walmart.com', 'walmart.com', 'localhost']);
for (const f of files.filter((p) => /\.(js|html|css|webmanifest)$/.test(p) && !/sample\//.test(rel(p)))) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    if (!ALLOWED_HOSTS.has(m[1].toLowerCase())) fail(`${rel(f)}: references ${m[0]}`);
  }
  if (/\b(gtag|googletagmanager|plausible|posthog|segment\.com|sentry|hotjar|mixpanel)\b/i.test(text)) fail(`${rel(f)}: analytics-looking code`);
  if (/lorem ipsum/i.test(text)) fail(`${rel(f)}: placeholder text`);
}

// 4. Landing media budgets.
const poster = join(dist, 'landing/loop-poster.avif');
const video = join(dist, 'landing/loop.mp4');
if (!existsSync(poster)) fail('landing/loop-poster.avif missing (run `pnpm loop`)');
else if (statSync(poster).size > 80 * 1024) fail(`poster ${kb(statSync(poster).size)} > 80 kB`);
if (!existsSync(video)) fail('landing/loop.mp4 missing (run `pnpm loop`)');
else if (statSync(video).size > 1.2 * 1024 * 1024) fail(`loop.mp4 ${kb(statSync(video).size)} > 1.2 MB`);
for (const f of files.filter((p) => p.endsWith('.avif') && rel(p).startsWith('landing/t/')))
  if (statSync(f).size > 40 * 1024) fail(`${rel(f)} > 40 kB`);

// 5. Web app: manifest, service worker and a complete precache.
const manifest = JSON.parse(readFileSync(join(dist, 'app/manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone') fail('manifest display must be standalone');
if (!manifest.icons?.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')) fail('manifest needs a 512 maskable icon');
for (const i of manifest.icons ?? []) if (!existsSync(join(dist, 'app', i.src))) fail(`manifest icon ${i.src} missing`);
const sw = readFileSync(join(dist, 'app/sw.js'), 'utf8');
const list = JSON.parse(/const FILES = (\[.*\]);/.exec(sw)?.[1] ?? '[]');
let precache = 0;
for (const f of list) {
  const p = join(dist, 'app', f);
  if (!existsSync(p) && f !== './') fail(`sw.js lists ${f} but it is not in dist`);
  else if (f !== './') precache += statSync(p).size;
}
for (const need of ['../sample/page-1.html', '../sample/page-2.html', '../fonts/rethink-sans-latin-wght.woff2'])
  if (!list.includes(need)) fail(`sw.js does not precache ${need}`);
if (!list.some((f) => /assets\/app-.*\.js$/.test(f))) fail('sw.js does not precache the app bundle');
if (/fetch\(\s*['"`]https?:/.test(sw)) fail('sw.js makes a network call');
notes.push(`web app precache: ${list.length} files, ${(precache / 1024 / 1024).toFixed(2)} MB`);

for (const n of notes) console.log(n);
if (problems.length) {
  console.error(`\ncheck-dist: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('check-dist: ok');
