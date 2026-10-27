// Unit tests for the site's use of the real engine. Run with `pnpm test` (node --test through tsx).
// They prove the web app drives the same code as the extension: the sample page goes through the real
// Amazon adapter and scanDocument, and photos are grouped by the real hashes and cluster().
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { Window } from 'happy-dom';
import sharp from 'sharp';
import {
  ADAPTERS,
  cluster,
  hashImage,
  mergePageScan,
  scanDocument,
  type ImageHashes,
  type Listing,
  type RgbaImage,
  type ScanClient,
} from '@engine';

const root = join(import.meta.dirname, '..');

async function rgba(buf: Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(buf)
    .flatten({ background: '#ffffff' })
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

const sampleImage = (u: string) =>
  join(root, 'public', 'sample', 'img', new URL(u).pathname.split('/').pop()!);

const client: ScanClient = {
  async hashImages({ urls }) {
    const out: Awaited<ReturnType<ScanClient['hashImages']>> = {};
    for (const u of urls) out[u] = { ok: true, hashes: hashImage(await rgba(readFileSync(sampleImage(u)))) };
    return out;
  },
  async mergeQuerySession(scan) {
    return mergePageScan(null, scan, 0);
  },
  async commitLetters() {},
};

describe('sample results page', () => {
  it('is read by the real adapter and grouped by the real engine', async () => {
    const html = readFileSync(join(root, 'public', 'sample', 'page-1.html'), 'utf8');
    const doc = new Window().document;
    doc.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>|<\/html>[\s\S]*$/gi, '');
    const outcome = await scanDocument({
      adapter: ADAPTERS['amazon-us'],
      doc: doc as unknown as Document,
      href: 'https://www.amazon.com/s?k=laptop+stand',
      client,
      settings: { strictness: 'standard', sessionMemory: false },
    });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.summary.listings, 60);
    assert.equal(outcome.result.summary.twinGroups, 6, 'the app copy says "60 made-up listings, six groups"');
    for (const g of outcome.result.groups) assert.ok(g.memberIds.length >= 2);
  });
});

describe('picked photos', () => {
  const shapes = (n: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#fff"/>` +
    `<circle cx="${60 + ((n * 23) % 120)}" cy="${70 + ((n * 31) % 90)}" r="${40 + ((n * 7) % 30)}" fill="#2a5db0"/>` +
    `<rect x="${30 + ((n * 41) % 100)}" y="${120 + ((n * 13) % 60)}" width="100" height="70" fill="#d33"/></svg>`;
  const photo = (n: number, scale = 1, quality = 90) =>
    sharp(Buffer.from(shapes(n)))
      .resize(Math.round(300 * scale))
      .jpeg({ quality })
      .toBuffer();

  function listing(id: string, price: number | null): Listing {
    return {
      id,
      store: 'amazon-us',
      page: 1,
      position: 0,
      url: '',
      imageUrl: id,
      title: 'product photo',
      brand: null,
      brandConfidence: 'none',
      price: price != null ? { amount: price, currency: 'USD', isFromRange: false } : null,
      packCount: 1,
      packCountCertain: true,
      rating: null,
      reviewCount: null,
      sponsored: false,
    };
  }

  it('groups a resized, re-compressed copy with its original and leaves a different photo alone', async () => {
    const hashes: Record<string, ImageHashes> = {
      a: hashImage(await rgba(await photo(3))),
      b: hashImage(await rgba(await photo(3, 0.7, 55))),
      c: hashImage(await rgba(await photo(11))),
    };
    const result = cluster({
      listings: [listing('a', 34.99), listing('b', 11.99), listing('c', null)],
      hashes,
    });
    assert.equal(result.summary.twinGroups, 1);
    assert.deepEqual([...(result.groups[0]?.memberIds ?? [])].sort(), ['a', 'b']);
  });

  it('computes the brand tax from the two prices', async () => {
    const hashes = {
      a: hashImage(await rgba(await photo(3))),
      b: hashImage(await rgba(await photo(3, 0.8, 70))),
    };
    const result = cluster({ listings: [listing('a', 34.99), listing('b', 11.99)], hashes });
    assert.equal(result.groups[0]?.brandTax?.amount, 23);
  });
});

describe('the engine is imported, never re-implemented', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
    });
  }
  it('has no hashing or clustering code under site/src', () => {
    const banned = /function\s+(dhash|phash|hamming|cluster|twinEdge|brandTax|pixelDiff|resampleSquare)\b/;
    for (const f of walk(join(root, 'src'))) assert.doesNotMatch(readFileSync(f, 'utf8'), banned, f);
  });
  it('imports the engine only through the @engine alias', () => {
    for (const f of walk(join(root, 'src'))) {
      assert.doesNotMatch(readFileSync(f, 'utf8'), /from\s+['"](\.\.\/)+(src|core)\//, f);
    }
  });
});
