import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Locator, Page, TestInfo } from '@playwright/test';
import sharp from 'sharp';

export const ORIGIN = 'http://127.0.0.1:4180';
export const DIST = resolve(import.meta.dirname, '..', '..', 'dist');

/** A synthetic product photo: a few shapes on white. A different seed makes a different picture. */
export async function photo(
  seed: number,
  opts: { scale?: number; quality?: number; format?: 'jpeg' | 'png' } = {},
) {
  const shapes = [
    `<circle cx="${60 + ((seed * 23) % 120)}" cy="${70 + ((seed * 31) % 90)}" r="${40 + ((seed * 7) % 30)}" fill="#2a5db0"/>`,
    `<rect x="${30 + ((seed * 41) % 100)}" y="${120 + ((seed * 13) % 60)}" width="${90 + ((seed * 5) % 60)}" height="${50 + ((seed * 9) % 50)}" fill="#d33"/>`,
    `<polygon points="${20 + ((seed * 17) % 80)},200 ${220 - ((seed * 11) % 60)},${40 + ((seed * 19) % 60)} 240,${230 - ((seed * 3) % 40)}" fill="#3b9"/>`,
  ].join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#fff"/>${shapes}</svg>`;
  let img = sharp(Buffer.from(svg));
  if (opts.scale) img = img.resize(Math.round(300 * opts.scale));
  return opts.format === 'png' ? img.png().toBuffer() : img.jpeg({ quality: opts.quality ?? 90 }).toBuffer();
}

/** The three-photo set used across the picker tests: an original, a re-save of it, and a different photo. */
export async function trio() {
  return [
    { name: 'a-original.jpg', mimeType: 'image/jpeg', buffer: await photo(3) },
    { name: 'b-resaved.jpg', mimeType: 'image/jpeg', buffer: await photo(3, { scale: 0.7, quality: 55 }) },
    { name: 'c-different.jpg', mimeType: 'image/jpeg', buffer: await photo(11) },
  ];
}

/** Every file in site/dist as a URL path, plus the directory index forms (`/app/` for `/app/index.html`). */
export function distPaths(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const rel = '/' + relative(DIST, full).split(sep).join('/');
        out.add(rel);
        if (rel.endsWith('/index.html')) out.add(rel.slice(0, -'index.html'.length));
      }
    }
  };
  if (existsSync(DIST)) walk(DIST);
  return out;
}

export interface Seen {
  method: string;
  url: string;
  type: string;
}

/** Records every request and websocket a page makes. */
export function watch(page: Page) {
  const requests: Seen[] = [];
  const sockets: string[] = [];
  page.on('request', (r) => requests.push({ method: r.method(), url: r.url(), type: r.resourceType() }));
  page.on('websocket', (w) => sockets.push(w.url()));
  return { requests, sockets };
}

/** What counts as "a static asset": a GET to our own origin for a file that exists in dist/. */
export function strays(requests: Seen[], known = distPaths()): string[] {
  return requests
    .filter((r) => !r.url.startsWith('data:') && !r.url.startsWith('blob:'))
    .filter((r) => {
      const u = new URL(r.url);
      return !(r.method === 'GET' && u.origin === ORIGIN && u.search === '' && known.has(u.pathname));
    })
    .map((r) => `${r.method} ${r.url} (${r.type})`);
}

/** A tap on a phone profile, a click everywhere else. */
export function press(loc: Locator, info: TestInfo) {
  return info.project.name === 'phone' ? loc.tap() : loc.click();
}
