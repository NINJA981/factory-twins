// Local static server for the e2e tests: http://localhost:4173. Serves the demo results page in an
// Amazon-shaped URL (/s?k=laptop+stand&page=N) plus its synthetic images. Nothing here leaves the
// machine, and the e2e extension build is the only thing that matches this origin.
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demo = join(root, 'tests', 'fixtures', 'demo', 'laptop-stand');
const PORT = Number(process.env.FT_FIXTURE_PORT ?? 4173);

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname === '/healthz') return send(res, 200, 'text/plain', 'ok');

  if (url.pathname === '/s') {
    const page = url.searchParams.get('page') === '2' ? 'page2.html' : 'page.html';
    const file = join(demo, page);
    if (!existsSync(file)) return send(res, 404, 'text/plain', `missing ${page}; run pnpm fixtures`);
    return send(res, 200, 'text/html; charset=utf-8', readFileSync(file));
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
