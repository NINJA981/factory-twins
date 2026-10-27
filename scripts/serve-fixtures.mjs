// Local static server for the e2e tests: http://localhost:4817. Serves the demo results page in an
// Amazon-shaped URL (/s?k=laptop+stand&page=N) plus its synthetic images. Nothing here leaves the
// machine, and the e2e extension build is the only thing that matches this origin.
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demo = join(root, 'tests', 'fixtures', 'demo', 'laptop-stand');
const sample = join(root, 'site', 'public', 'sample');
const PORT = Number(process.env.FT_FIXTURE_PORT ?? 4817);

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

// Every request that reaches this server, so the e2e tests can see what the extension itself fetched
// (Playwright cannot observe requests made by an extension's service worker or offscreen document).
const log = [];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname === '/healthz') return send(res, 200, 'text/plain', 'ok');
  if (url.pathname === '/__log') {
    const body = JSON.stringify(log);
    if (url.searchParams.has('clear')) log.length = 0;
    return send(res, 200, 'application/json', body);
  }
  log.push({
    path: url.pathname + url.search,
    origin: req.headers.origin ?? null,
    site: req.headers['sec-fetch-site'] ?? null,
    dest: req.headers['sec-fetch-dest'] ?? null,
  });

  if (url.pathname === '/s') {
    const page = url.searchParams.get('page') === '2' ? 'page2.html' : 'page.html';
    const file = join(demo, page);
    if (!existsSync(file)) return send(res, 404, 'text/plain', `missing ${page}; run pnpm fixtures`);
    // Give the made-up listings a store-like layout (never part of the extension); ?theme=dark darkens the page.
    let html = readFileSync(file, 'utf8');
    html = html.replace(
      '</head>',
      '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/store.css"></head>',
    );
    if (url.searchParams.get('theme') === 'dark') html = html.replace('<body>', '<body class="dark">');
    return send(res, 200, 'text/html; charset=utf-8', html);
  }

  // The web app's bundled sample page (site/public/sample), served in the same Amazon-shaped URL space so the
  // extension can read the very page the web app reads (the parity test compares the two).
  if (url.pathname === '/s/web-sample') {
    const file = join(sample, 'page-1.html');
    if (!existsSync(file)) return send(res, 404, 'text/plain', 'missing site/public/sample');
    const html = readFileSync(file, 'utf8')
      .replaceAll(`http://localhost:${PORT}/img/`, `http://localhost:${PORT}/sample-img/`)
      .replace('</head>', '<link rel="stylesheet" href="/store.css"></head>');
    return send(res, 200, 'text/html; charset=utf-8', html);
  }

  if (url.pathname.startsWith('/sample-img/')) {
    const file = normalize(join(sample, 'img', url.pathname.slice('/sample-img/'.length)));
    if (!file.startsWith(join(sample, 'img')) || !existsSync(file))
      return send(res, 404, 'text/plain', 'not found');
    res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'max-age=60' });
    return createReadStream(file).pipe(res);
  }

  if (url.pathname === '/store.css') {
    return send(res, 200, 'text/css', readFileSync(join(root, 'scripts', 'fixture-store.css')));
  }

  if (url.pathname.startsWith('/img/')) {
    const file = normalize(join(demo, 'img', url.pathname.slice('/img/'.length)));
    if (!file.startsWith(join(demo, 'img')) || !existsSync(file))
      return send(res, 404, 'text/plain', 'not found');
    res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'max-age=60' });
    return createReadStream(file).pipe(res);
  }

  // A page with no results container, for the error-state test.
  if (url.pathname === '/s/broken') {
    return send(
      res,
      200,
      'text/html; charset=utf-8',
      '<!doctype html><title>x</title><body><div id="search"><p>Layout changed</p></div></body>',
    );
  }

  return send(res, 404, 'text/plain', 'not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fixture server on http://localhost:${PORT}`);
});
