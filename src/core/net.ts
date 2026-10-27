import type { NetworkCounter } from './types';

// The popup's privacy panel (SPEC AC-F9.3) shows these numbers, so they come from what the hasher
// actually did, never from a hard-coded string.

export function emptyCounter(): NetworkCounter {
  return { byHost: {}, blocked: 0, cacheHits: 0, cacheUnknown: 0 };
}

/** Per-URL outcome the hasher reports for every request it made or refused. */
export type ReadRecord =
  | { kind: 'read'; host: string; fromCache: boolean | null }
  | { kind: 'blocked' }
  /** Answered from the extension's own hash cache: no request at all. */
  | { kind: 'cached' };

export function recordReads(counter: NetworkCounter, records: readonly ReadRecord[]): NetworkCounter {
  const next: NetworkCounter = { ...counter, byHost: { ...counter.byHost } };
  for (const r of records) {
    if (r.kind === 'blocked') next.blocked++;
    else if (r.kind === 'read') {
      next.byHost[r.host] = (next.byHost[r.host] ?? 0) + 1;
      if (r.fromCache === true) next.cacheHits++;
      else if (r.fromCache === null) next.cacheUnknown++;
    }
  }
  return next;
}

export function totalReads(counter: NetworkCounter): number {
  return Object.values(counter.byHost).reduce((s, n) => s + n, 0);
}

/** Hosts contacted that are not in `allowed`. Must always be empty; the popup shows it if not. */
export function unexpectedHosts(counter: NetworkCounter, allowed: readonly string[]): string[] {
  return Object.keys(counter.byHost).filter((h) => !allowed.includes(h));
}

/** Coerces a stored value back into a counter (storage is untrusted). */
export function normalizeCounter(raw: unknown): NetworkCounter {
  const c = emptyCounter();
  if (typeof raw !== 'object' || raw === null) return c;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  if (typeof r.byHost === 'object' && r.byHost !== null) {
    for (const [h, v] of Object.entries(r.byHost as Record<string, unknown>))
      if (n(v) > 0) c.byHost[h] = n(v);
  }
  c.blocked = n(r.blocked);
  c.cacheHits = n(r.cacheHits);
  c.cacheUnknown = n(r.cacheUnknown);
  return c;
}
