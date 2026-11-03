import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { ADAPTERS } from '../../../src/adapters/registry';
import { readPage } from '../../../src/adapters/read';
import type { ImageHashes, Listing, StoreId } from '../../../src/core/types';

export const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures');

export interface Labels {
  store: StoreId;
  query: string;
  page: number;
  tiles: number;
  withPrice: number;
  widgets: number;
  groups: string[][];
  variantFamilies: string[][];
}

export interface Fixture {
  store: StoreId;
  slug: string;
  dir: string;
  html: string;
  hashes: Record<string, ImageHashes>;
  labels: Labels;
}

const STORE_DIRS: Record<StoreId, string> = { 'amazon-us': 'amazon', 'walmart-us': 'walmart' };

export function loadFixtures(store: StoreId): Fixture[] {
  const base = join(FIXTURES_DIR, STORE_DIRS[store]);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(base, d.name);
      return {
        store,
        slug: d.name,
        dir,
        html: readFileSync(join(dir, 'page.html'), 'utf8'),
        hashes: JSON.parse(readFileSync(join(dir, 'hashes.json'), 'utf8')) as Record<string, ImageHashes>,
        labels: JSON.parse(readFileSync(join(dir, 'labels.json'), 'utf8')) as Labels,
      };
    });
}

/** Search URL the adapter accepts for a fixture. */
export function fixtureUrl(f: Fixture): string {
  const q = encodeURIComponent(f.labels.query);
  return f.store === 'amazon-us'
    ? `https://www.amazon.com/s?k=${q}&page=${f.labels.page}`
    : `https://www.walmart.com/search?q=${q}&page=${f.labels.page}`;
}

/** A fresh happy-dom document holding the fixture page. */
export function fixtureDocument(f: Fixture): Document {
  const win = new Window({ url: fixtureUrl(f) });
  win.document.documentElement.innerHTML = f.html.replace(/^<!doctype html>/i, '');
  return win.document as unknown as Document;
}

const listingsCache = new WeakMap<Fixture, Listing[]>();

/**
 * Listings as the real adapter reads them from page.html. Read once per fixture and the happy-dom
 * window closed straight after: the corpus tests ask for every fixture several times, and open
 * windows add up to hundreds of megabytes.
 */
export function fixtureListings(f: Fixture): Listing[] {
  const cached = listingsCache.get(f);
  if (cached) return cached;
  const win = new Window({ url: fixtureUrl(f) });
  win.document.documentElement.innerHTML = f.html.replace(/^<!doctype html>/i, '');
  const r = readPage(ADAPTERS[f.store], win.document as unknown as Document, fixtureUrl(f));
  void win.happyDOM.close();
  if (!r.ok) throw new Error(`${f.store}/${f.slug} unreadable: ${r.reason}`);
  listingsCache.set(f, r.listings);
  return r.listings;
}

/** All unordered pairs of ids that share a group. */
export function pairsOf(groups: readonly (readonly string[])[]): Set<string> {
  const out = new Set<string>();
  for (const g of groups) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const [a, b] = [g[i] as string, g[j] as string].sort();
        out.add(`${a}|${b}`);
      }
    }
  }
  return out;
}
