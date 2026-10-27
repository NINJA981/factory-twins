import { MAX_QUERY_SESSIONS, MAX_SESSION_BYTES } from '../constants';
import type { ImageHashes, Listing, QuerySession, StoreId } from '../types';

export interface PageScan {
  key: string;
  store: StoreId;
  query: string;
  page: number;
  listings: readonly Listing[];
  hashes: Readonly<Record<string, ImageHashes>>;
}

export function emptySession(scan: Pick<PageScan, 'key' | 'store' | 'query'>, now: number): QuerySession {
  return {
    key: scan.key,
    store: scan.store,
    query: scan.query,
    listings: {},
    hashes: {},
    letters: {},
    pages: [],
    lastSeen: now,
  };
}

/**
 * Joins one page's scan into the query session (SPEC F8). A listing keeps its earliest sighting
 * (page 1 beats a sponsored repeat on page 3), except that a re-scan of the same page refreshes it
 * (prices change, lazy tiles fill in). Hashes are added, never dropped; letters are untouched here
 * and updated by the caller from the clustering result.
 */
export function mergePageScan(session: QuerySession | null, scan: PageScan, now: number): QuerySession {
  const base = session && session.key === scan.key ? session : emptySession(scan, now);
  const listings: Record<string, Listing> = { ...base.listings };
  for (const l of scan.listings) {
    const prev = listings[l.id];
    if (!prev || prev.page === l.page || l.page < prev.page) listings[l.id] = l;
  }
  const hashes: Record<string, ImageHashes> = { ...base.hashes };
  for (const [id, h] of Object.entries(scan.hashes)) hashes[id] = h;
  const pages = [...new Set([...base.pages, scan.page])].sort((a, b) => a - b);
  return { ...base, listings, hashes, pages, lastSeen: now };
}

export function approxBytes(value: unknown): number {
  return JSON.stringify(value).length * 2;
}

/**
 * Keeps a session under the per-query budget (SPEC AC-F8.4) by dropping whole pages, furthest
 * from `currentPage` first. The current page is never dropped.
 */
export function trimSessionToBudget(
  session: QuerySession,
  currentPage: number,
  maxBytes: number = MAX_SESSION_BYTES,
): QuerySession {
  let s = session;
  const droppable = s.pages
    .filter((p) => p !== currentPage)
    .sort((a, b) => Math.abs(b - currentPage) - Math.abs(a - currentPage) || b - a);
  while (approxBytes(s) > maxBytes && droppable.length > 0) {
    const drop = droppable.shift() as number;
    const listings: Record<string, Listing> = {};
    const hashes: Record<string, ImageHashes> = {};
    const letters: Record<string, string> = {};
    for (const [id, l] of Object.entries(s.listings)) {
      if (l.page === drop) continue;
      listings[id] = l;
      const h = s.hashes[id];
      if (h) hashes[id] = h;
      const letter = s.letters[id];
      if (letter) letters[id] = letter;
    }
    s = { ...s, listings, hashes, letters, pages: s.pages.filter((p) => p !== drop) };
  }
  return s;
}

export interface SessionIndexEntry {
  key: string;
  lastSeen: number;
}

/** Least-recently-used eviction (SPEC AC-F8.4): returns the index to keep and the keys to delete. */
export function evictSessions(
  index: readonly SessionIndexEntry[],
  max: number = MAX_QUERY_SESSIONS,
): { keep: SessionIndexEntry[]; evict: string[] } {
  const sorted = [...index].sort((a, b) => b.lastSeen - a.lastSeen);
  return { keep: sorted.slice(0, max), evict: sorted.slice(max).map((e) => e.key) };
}

/** Upserts a key into the LRU index. */
export function touchIndex(
  index: readonly SessionIndexEntry[],
  key: string,
  now: number,
): SessionIndexEntry[] {
  return [{ key, lastSeen: now }, ...index.filter((e) => e.key !== key)];
}
