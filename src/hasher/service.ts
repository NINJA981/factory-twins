import { mapPool } from '../core/async';
import { HASH_CONCURRENCY } from '../core/constants';
import { hashImage } from '../core/hash/index';
import { pixelDiff } from '../core/hash/pixelDiff';
import type { ReadRecord } from '../core/net';
import type { StoreId } from '../core/types';
import type { DiffOutcome, HashOutcome, Hasher, ReadResult } from './types';

export type ReadFn = (url: string, store: StoreId) => Promise<ReadResult>;

function recordOf(r: ReadResult): ReadRecord | null {
  if (r.ok) return { kind: 'read', host: r.host, fromCache: r.fromCache };
  if (r.error === 'not-allowlisted' || r.error === 'invalid-url') return { kind: 'blocked' };
  // A failed request still contacted the host; count it so the privacy panel stays truthful.
  return r.host ? { kind: 'read', host: r.host, fromCache: null } : null;
}

/**
 * The hasher's work, independent of where it runs: read each URL (allowlist → fetch → decode),
 * hash the pixels, drop them. Identical URLs in one request are read once.
 */
export function createHashService(read: ReadFn, concurrency: number = HASH_CONCURRENCY): Hasher {
  return {
    async hash({ store, urls }) {
      const unique = [...new Set(urls)];
      const outcomes = await mapPool(unique, concurrency, async (url): Promise<HashOutcome> => {
        const r = await read(url, store);
        const record = recordOf(r);
        if (!r.ok) return { url, ok: false, error: r.error, record };
        try {
          return { url, ok: true, hashes: hashImage(r.image), record };
        } catch {
          return { url, ok: false, error: 'decode', record };
        }
      });
      const byUrl = new Map(outcomes.map((o) => [o.url, o]));
      // Duplicates after the first carry no record, so one read is counted once.
      return urls.map((u, i): HashOutcome => {
        const o = byUrl.get(u) as HashOutcome;
        return urls.indexOf(u) === i ? o : { ...o, record: null };
      });
    },
    async diff({ store, a, b }): Promise<DiffOutcome> {
      const [ra, rb] = await Promise.all([read(a, store), a === b ? null : read(b, store)]);
      const second = rb ?? ra;
      const records = [ra, rb].flatMap((r) =>
        r ? [recordOf(r)].filter((x): x is ReadRecord => x != null) : [],
      );
      if (!ra.ok) return { ok: false, error: ra.error, records };
      if (!second.ok) return { ok: false, error: second.error, records };
      return { ok: true, result: pixelDiff(ra.image, second.image), records };
    },
  };
}
