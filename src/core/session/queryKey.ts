import type { StoreId } from '../types';

/** What an adapter reads from a search URL (SPEC AC-F8.1). */
export interface QueryInfo {
  /** The search text as typed (decoded). */
  query: string;
  /** Sort and filter parameters that change the result set. Page and tracking params excluded. */
  params: Record<string, string>;
  /** 1-based result page. */
  page: number;
}

export function normalizeQuery(q: string): string {
  return q.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** FNV-1a, 32-bit, as 8 hex characters. Stable across runtimes; not a security hash. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Canonical string for a query: normalised text plus sorted sort/filter parameters. */
export function canonicalQuery(info: Pick<QueryInfo, 'query' | 'params'>): string {
  const params = Object.entries(info.params)
    .filter(([, v]) => v !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${normalizeQuery(info.query)}?${params}`;
}

/** Storage key `q:<store>:<hash>`; the same for every page of the same query. */
export function queryKey(store: StoreId, info: Pick<QueryInfo, 'query' | 'params'>): string {
  return `q:${store}:${fnv1a(canonicalQuery(info))}`;
}
