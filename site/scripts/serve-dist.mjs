// A small static server for dist/ that behaves like a real static host: gzip for text, long cache for
// hashed assets, no SPA fallback (unknown paths are 404, directories serve index.html). `vite preview`
// does none of that, so performance numbers should be taken against this one.
// Usage: node scripts/serve-dist.mjs [port]   (default 4182)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const root = join(import.meta.dirname, '..', 'dist');
const port = Number(process.argv[2] ?? 4182);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const compressible = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt']);

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = join(root, path);
  if (!file.startsWith(root)) return void res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) return void res.writeHead(301, { location: `${url.pathname}/` }).end();
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) return void res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  const ext = extname(file);
  const headers = { 'content-type': types[ext] ?? 'application/octet-stream' };
  headers['cache-control'] = /\/assets\/|\.woff2$/.test(file.replaceAll('\\', '/'))
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  const gz = compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (gz) headers['content-encoding'] = 'gzip';
  headers.vary = 'Accept-Encoding';
  res.writeHead(200, headers);
  const s = createReadStream(file);
  (gz ? s.pipe(createGzip()) : s).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`dist on http://127.0.0.1:${port}`));
