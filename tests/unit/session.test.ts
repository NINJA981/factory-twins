import { describe, expect, it } from 'vitest';
import { MAX_QUERY_SESSIONS } from '../../src/core/constants';
import { RecordLru } from '../../src/core/session/lruCache';
import {
  approxBytes,
  emptySession,
  evictSessions,
  mergePageScan,
  touchIndex,
  trimSessionToBudget,
  type PageScan,
} from '../../src/core/session/merge';
import { canonicalQuery, fnv1a, normalizeQuery, queryKey } from '../../src/core/session/queryKey';
import { hashes, listing } from './helpers/listing';

const scanOf = (page: number, ids: string[], over: Partial<PageScan> = {}): PageScan => ({
  key: 'q:amazon-us:abc',
  store: 'amazon-us',
  query: 'laptop stand',
  page,
  listings: ids.map((id, i) => listing({ id, page, position: i })),
  hashes: Object.fromEntries(ids.map((id) => [id, hashes([1])])),
  ...over,
});

describe('query keys (AC-F8.1)', () => {
  it('is the same for every page of one query', () => {
    const base = { query: 'Laptop  Stand', params: { s: 'price-asc-rank' } };
    expect(queryKey('amazon-us', base)).toBe(queryKey('amazon-us', { ...base, query: ' laptop stand ' }));
  });
  it('changes with the store, the query and the sort or filter params', () => {
    const q = { query: 'laptop stand', params: {} };
    const keys = new Set([
      queryKey('amazon-us', q),
      queryKey('walmart-us', q),
      queryKey('amazon-us', { query: 'led strip', params: {} }),
      queryKey('amazon-us', { query: 'laptop stand', params: { s: 'review-rank' } }),
    ]);
    expect(keys.size).toBe(4);
  });
  it('does not depend on parameter order or empty parameters', () => {
    expect(canonicalQuery({ query: 'x', params: { b: '2', a: '1' } })).toBe(
      canonicalQuery({ query: 'x', params: { a: '1', b: '2', c: '' } }),
    );
  });
  it('has the q:<store>:<hash> shape', () => {
    expect(queryKey('walmart-us', { query: 'x', params: {} })).toMatch(/^q:walmart-us:[0-9a-f]{8}$/);
  });
  it('normalises Unicode and case', () => {
    expect(normalizeQuery('ＬＡＰＴＯＰ  Stand')).toBe('laptop stand');
  });
  it('hashes with a stable FNV-1a', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
    expect(fnv1a('foobar')).toBe('bf9cf968');
  });
});

describe('mergePageScan (SPEC F8)', () => {
  it('starts a session from nothing', () => {
    const s = mergePageScan(null, scanOf(1, ['a', 'b']), 1000);
    expect(Object.keys(s.listings)).toEqual(['a', 'b']);
    expect(s.pages).toEqual([1]);
    expect(s.lastSeen).toBe(1000);
  });

  it('joins page 2 to page 1', () => {
    const s1 = mergePageScan(null, scanOf(1, ['a', 'b']), 1);
    const s2 = mergePageScan(s1, scanOf(2, ['c']), 2);
    expect(Object.keys(s2.listings).sort()).toEqual(['a', 'b', 'c']);
    expect(Object.keys(s2.hashes).sort()).toEqual(['a', 'b', 'c']);
    expect(s2.pages).toEqual([1, 2]);
  });

  it('keeps the earliest sighting of a repeated listing', () => {
    const s1 = mergePageScan(null, scanOf(1, ['a']), 1);
    const s3 = mergePageScan(s1, scanOf(3, ['a']), 2);
    expect(s3.listings.a?.page).toBe(1);
  });

  it('refreshes a listing when the same page is scanned again', () => {
    const s1 = mergePageScan(null, scanOf(1, ['a']), 1);
    const again = scanOf(1, ['a']);
    again.listings = [listing({ id: 'a', page: 1, price: 99 })];
    expect(mergePageScan(s1, again, 2).listings.a?.price?.amount).toBe(99);
  });

  it('starts over when the key differs', () => {
    const s1 = mergePageScan(null, scanOf(1, ['a']), 1);
    const other = mergePageScan(s1, scanOf(1, ['z'], { key: 'q:amazon-us:other' }), 2);
    expect(Object.keys(other.listings)).toEqual(['z']);
  });

  it('does not mutate its input', () => {
    const s1 = mergePageScan(null, scanOf(1, ['a']), 1);
    const frozen = JSON.stringify(s1);
    mergePageScan(s1, scanOf(2, ['b']), 2);
    expect(JSON.stringify(s1)).toBe(frozen);
  });
});

describe('trimSessionToBudget (AC-F8.4: at most 200 KB per query)', () => {
  const big = () => {
    let s = emptySession({ key: 'k', store: 'amazon-us', query: 'q' }, 1);
    for (let page = 1; page <= 6; page++) {
      s = mergePageScan(
        s,
        scanOf(
          page,
          Array.from({ length: 60 }, (_, i) => `p${page}-${i}`),
          { key: 'k' },
        ),
        page,
      );
    }
    return s;
  };

  it('leaves a small session alone', () => {
    const s = mergePageScan(null, scanOf(1, ['a']), 1);
    expect(trimSessionToBudget(s, 1)).toBe(s);
  });

  it('drops the pages furthest from the current one first and never the current page', () => {
    const s = big();
    const budget = Math.floor(approxBytes(s) * 0.55);
    const trimmed = trimSessionToBudget(s, 3, budget);
    expect(approxBytes(trimmed)).toBeLessThanOrEqual(budget);
    expect(trimmed.pages).toContain(3);
    expect(trimmed.pages).not.toContain(6);
    expect(Object.values(trimmed.listings).every((l) => trimmed.pages.includes(l.page))).toBe(true);
    expect(Object.keys(trimmed.hashes).every((id) => trimmed.listings[id])).toBe(true);
  });

  it('keeps the current page even when it alone is over budget', () => {
    const trimmed = trimSessionToBudget(big(), 2, 10);
    expect(trimmed.pages).toEqual([2]);
  });
});

describe('LRU eviction of sessions (AC-F8.4: at most 50 queries)', () => {
  it('keeps the most recently used', () => {
    const index = Array.from({ length: 53 }, (_, i) => ({ key: `k${i}`, lastSeen: i }));
    const { keep, evict } = evictSessions(index);
    expect(keep).toHaveLength(MAX_QUERY_SESSIONS);
    expect(evict).toEqual(['k2', 'k1', 'k0']);
    expect(keep[0]?.key).toBe('k52');
  });
  it('touches an existing key to the front without duplicating it', () => {
    const next = touchIndex(
      [
        { key: 'a', lastSeen: 1 },
        { key: 'b', lastSeen: 2 },
      ],
      'a',
      9,
    );
    expect(next).toEqual([
      { key: 'a', lastSeen: 9 },
      { key: 'b', lastSeen: 2 },
    ]);
  });
});

describe('RecordLru (hash cache, at most 5,000 entries)', () => {
  it('evicts the oldest when full', () => {
    const lru = new RecordLru<number>(3);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('c', 3);
    lru.set('d', 4);
    expect(lru.has('a')).toBe(false);
    expect(lru.size).toBe(3);
  });
  it('refreshes recency on get', () => {
    const lru = new RecordLru<number>(3, { a: 1, b: 2, c: 3 });
    lru.get('a');
    lru.set('d', 4);
    expect(lru.has('a')).toBe(true);
    expect(lru.has('b')).toBe(false);
  });
  it('trims an oversized stored record on load', () => {
    expect(new RecordLru<number>(2, { a: 1, b: 2, c: 3 }).toRecord()).toEqual({ b: 2, c: 3 });
  });
  it('round-trips through a record', () => {
    const lru = new RecordLru<number>(5, { a: 1 });
    lru.set('b', 2);
    expect(new RecordLru<number>(5, lru.toRecord()).toRecord()).toEqual({ a: 1, b: 2 });
    expect(lru.delete('a')).toBe(true);
    expect(lru.get('nope')).toBeUndefined();
  });
  it('rejects a bad capacity', () => {
    expect(() => new RecordLru(0)).toThrow(RangeError);
  });
});
