import { readPage } from '../adapters/read';
import type { StoreAdapter } from '../adapters/types';
import { chunk } from '../core/async';
import { cluster, type ClusterResult } from '../core/cluster/groups';
import { HASH_BATCH_SIZE } from '../core/constants';
import type { PageScan } from '../core/session/merge';
import { queryKey } from '../core/session/queryKey';
import type { PillErrorReason } from '../core/state/pill';
import type { ImageHashes, Listing, QuerySession, Settings } from '../core/types';
import type { HashImagesResult } from '../messaging/protocol';

// One scan of a results page (ADR, scan sequence), with every browser-extension call behind
// `ScanClient`. The content script passes a messaging client; tests and the web app pass their own.

export interface ScanClient {
  hashImages(req: { store: Listing['store']; urls: string[] }): Promise<HashImagesResult>;
  mergeQuerySession(scan: PageScan): Promise<QuerySession>;
  commitLetters(data: { key: string; letters: Record<string, string> }): Promise<void>;
}

export interface ScanOptions {
  adapter: StoreAdapter;
  doc: Document;
  href: string;
  client: ScanClient;
  settings: Pick<Settings, 'strictness' | 'sessionMemory'>;
  /** Letters from earlier scans of this page when session memory is off. */
  localLetters?: Record<string, string>;
  onStart?: (total: number) => void;
  onProgress?: (done: number, total: number) => void;
}

export type ScanOutcome =
  | {
      ok: true;
      key: string;
      page: number;
      result: ClusterResult;
      session: QuerySession;
      /** Listing id → tile element on this page. */
      tilesById: Map<string, Element>;
      /** Listings on this page whose photo could not be read. */
      unhashed: number;
    }
  | { ok: false; reason: PillErrorReason };

export async function scanDocument(opts: ScanOptions): Promise<ScanOutcome> {
  const { adapter, client } = opts;
  const read = readPage(adapter, opts.doc, opts.href);
  if (!read.ok) return { ok: false, reason: read.reason };
  const query = adapter.readQuery(new URL(opts.href));
  if (!query) return { ok: false, reason: 'not-search-page' };

  const urls = [...new Set(read.listings.map((l) => l.imageUrl))];
  opts.onStart?.(urls.length);
  const byUrl: HashImagesResult = {};
  let done = 0;
  try {
    for (const batch of chunk(urls, HASH_BATCH_SIZE)) {
      Object.assign(byUrl, await client.hashImages({ store: adapter.store, urls: batch }));
      done += batch.length;
      opts.onProgress?.(done, urls.length);
    }
  } catch {
    return { ok: false, reason: 'hasher-failed' };
  }

  const hashes: Record<string, ImageHashes> = {};
  let unhashed = 0;
  for (const l of read.listings) {
    const r = byUrl[l.imageUrl];
    if (r?.ok) hashes[l.id] = r.hashes;
    else unhashed++;
  }
  if (read.listings.length > 0 && unhashed === read.listings.length)
    return { ok: false, reason: 'hasher-failed' };

  const key = queryKey(adapter.store, query);
  const scan: PageScan = {
    key,
    store: adapter.store,
    query: query.query,
    page: query.page,
    listings: read.listings,
    hashes,
  };
  const session = await client.mergeQuerySession(scan);
  const result = cluster({
    listings: Object.values(session.listings),
    hashes: session.hashes,
    strictness: opts.settings.strictness,
    previousLetters: opts.settings.sessionMemory ? session.letters : (opts.localLetters ?? {}),
  });
  if (opts.settings.sessionMemory) await client.commitLetters({ key, letters: result.letters });
  return { ok: true, key, page: query.page, result, session, tilesById: read.tilesById, unhashed };
}
