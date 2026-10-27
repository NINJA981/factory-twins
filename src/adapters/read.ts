import type { Listing } from '../core/types';
import type { StoreAdapter } from './types';

export type PageReadResult =
  | { ok: true; listings: Listing[]; tiles: number; skipped: number; tilesById: Map<string, Element> }
  | { ok: false; reason: 'not-search-page' | 'no-results-container' | 'unreadable-tiles'; tiles: number };

/**
 * Reads every product tile on the page through an adapter. Any adapter exception is caught and
 * reported as a failure, so a store DOM change degrades to the pill's error state and never throws
 * into the page (SPEC AC-F1.6).
 */
export function readPage(adapter: StoreAdapter, doc: Document, href: string): PageReadResult {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { ok: false, reason: 'not-search-page', tiles: 0 };
  }
  try {
    const query = adapter.readQuery(url);
    if (!query) return { ok: false, reason: 'not-search-page', tiles: 0 };
    const container = adapter.resultsContainer(doc);
    if (!container) return { ok: false, reason: 'no-results-container', tiles: 0 };
    const tiles = adapter.findTiles(container);
    const listings: Listing[] = [];
    const tilesById = new Map<string, Element>();
    let skipped = 0;
    tiles.forEach((tile) => {
      const listing = adapter.readTile(tile, {
        page: query.page,
        position: listings.length,
        baseUrl: url.href,
      });
      if (!listing || tilesById.has(listing.id)) {
        skipped++;
        return;
      }
      listings.push(listing);
      tilesById.set(listing.id, tile);
    });
    if (tiles.length > 0 && listings.length === 0)
      return { ok: false, reason: 'unreadable-tiles', tiles: tiles.length };
    return { ok: true, listings, tiles: tiles.length, skipped, tilesById };
  } catch {
    return { ok: false, reason: 'unreadable-tiles', tiles: 0 };
  }
}

/** Trimmed text content of the first match, or null. */
export function textOf(root: ParentNode, selector: string): string | null {
  const el = root.querySelector(selector);
  const t = el?.textContent?.replace(/\s+/g, ' ').trim();
  return t ? t : null;
}

export function attrOf(root: ParentNode, selector: string, attr: string): string | null {
  const v = root.querySelector(selector)?.getAttribute(attr)?.trim();
  return v ? v : null;
}
