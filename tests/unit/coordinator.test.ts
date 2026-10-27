import { describe, expect, it, vi } from 'vitest';
import { createCoordinator, KEYS, UNDO_WINDOW_MS } from '../../src/background/coordinator';
import { HASH_BATCH_SIZE, MAX_QUERY_SESSIONS } from '../../src/core/constants';
import type { PageScan } from '../../src/core/session/merge';
import type { ImageHashes, QuerySession } from '../../src/core/types';
import type { HashOutcome, Hasher } from '../../src/hasher/types';
import { createMemoryArea } from '../../src/storage/kv';
import { hashes, listing } from './helpers/listing';

const URL_A = 'https://m.media-amazon.com/images/I/a.jpg';

function fakeHasher(fail: (url: string) => boolean = () => false) {
  const hash = vi.fn(async ({ urls }: { urls: string[] }): Promise<HashOutcome[]> =>
    urls.map((url): HashOutcome =>
      fail(url)
        ? {
            url,
            ok: false,
            error: 'network',
            record: { kind: 'read', host: 'm.media-amazon.com', fromCache: null },
          }
        : {
            url,
            ok: true,
            hashes: hashes([url.length % 60]),
            record: { kind: 'read', host: 'm.media-amazon.com', fromCache: false },
          },
    ),
  );
  const diff = vi.fn(async () => ({
    ok: true as const,
    result: { differing: 0, total: 65536, identicalTenths: 1000, differingTenths: 0 },
    records: [{ kind: 'read' as const, host: 'm.media-amazon.com', fromCache: true }],
  }));
  return { hasher: { hash, diff } as Hasher, hash, diff };
}

function setup(opts: { fail?: (url: string) => boolean } = {}) {
  const session = createMemoryArea();
  const local = createMemoryArea();
  const h = fakeHasher(opts.fail);
  let t = 1000;
  let n = 0;
  const c = createCoordinator({ session, local, hasher: h.hasher, now: () => t, token: () => `tok${++n}` });
  return { c, session, local, ...h, tick: (ms: number) => (t += ms) };
}

const scan = (key: string, page: number, ids: string[]): PageScan => ({
  key,
  store: 'amazon-us',
  query: 'laptop stand',
  page,
  listings: ids.map((id, i) => listing({ id, page, position: i })),
  hashes: Object.fromEntries(ids.map((id) => [id, hashes([1])])),
});

describe('hashImages (ADR, scan sequence)', () => {
  it('sends misses to the hasher and caches the results', async () => {
    const { c, hash, session } = setup();
    const first = await c.hashImages({ store: 'amazon-us', urls: [URL_A] });
    expect(first[URL_A]).toMatchObject({ ok: true });
    expect(hash).toHaveBeenCalledTimes(1);
    const second = await c.hashImages({ store: 'amazon-us', urls: [URL_A] });
    expect(second[URL_A]).toEqual(first[URL_A]);
    expect(hash).toHaveBeenCalledTimes(1); // AC-F2.3: never fetched again in this session
    expect(Object.keys((await session.get<Record<string, ImageHashes>>(KEYS.hashCache)) ?? {})).toEqual([
      URL_A,
    ]);
  });

  it('batches misses in groups of 12', async () => {
    const { c, hash } = setup();
    const urls = Array.from({ length: 30 }, (_, i) => `https://m.media-amazon.com/images/I/${i}.jpg`);
    await c.hashImages({ store: 'amazon-us', urls });
    expect(hash.mock.calls.map((call) => call[0].urls.length)).toEqual([HASH_BATCH_SIZE, HASH_BATCH_SIZE, 6]);
  });

  it('asks for a duplicated URL once', async () => {
    const { c, hash } = setup();
    await c.hashImages({ store: 'amazon-us', urls: [URL_A, URL_A, URL_A] });
    expect(hash.mock.calls[0]?.[0].urls).toEqual([URL_A]);
  });

  it('does not cache a failure, so a later visit retries', async () => {
    let down = true;
    const { c, hash } = setup({ fail: () => down });
    const r1 = await c.hashImages({ store: 'amazon-us', urls: [URL_A] });
    expect(r1[URL_A]).toEqual({ ok: false, error: 'network' });
    down = false;
    const r2 = await c.hashImages({ store: 'amazon-us', urls: [URL_A] });
    expect(r2[URL_A]).toMatchObject({ ok: true });
    expect(hash).toHaveBeenCalledTimes(2);
  });

  it('counts reads by host from what the hasher reports (AC-F9.3)', async () => {
    const { c } = setup();
    await c.hashImages({ store: 'amazon-us', urls: [URL_A, 'https://m.media-amazon.com/images/I/b.jpg'] });
    await c.hashImages({ store: 'amazon-us', urls: [URL_A] }); // cache hit: no read
    const counter = await c.getNetworkCounter();
    expect(counter.byHost).toEqual({ 'm.media-amazon.com': 2 });
  });

  it('does not lose updates when scans overlap', async () => {
    const { c, session } = setup();
    const urls = (p: string) =>
      Array.from({ length: 5 }, (_, i) => `https://m.media-amazon.com/images/I/${p}${i}.jpg`);
    await Promise.all([
      c.hashImages({ store: 'amazon-us', urls: urls('x') }),
      c.hashImages({ store: 'amazon-us', urls: urls('y') }),
    ]);
    expect(Object.keys((await session.get<Record<string, unknown>>(KEYS.hashCache)) ?? {})).toHaveLength(10);
    expect((await c.getNetworkCounter()).byHost['m.media-amazon.com']).toBe(10);
  });

  it('measures pixel difference through the hasher and counts its reads', async () => {
    const { c, diff } = setup();
    const r = await c.pixelDiff({ store: 'amazon-us', a: URL_A, b: URL_A });
    expect(r).toMatchObject({ ok: true, result: { identicalTenths: 1000 } });
    expect(diff).toHaveBeenCalledTimes(1);
    expect((await c.getNetworkCounter()).cacheHits).toBe(1);
  });
});

describe('settings (AC-F10.2)', () => {
  it('starts with defaults, persists patches in local storage and survives garbage', async () => {
    const { c, local } = setup();
    expect((await c.getSettings()).autoPill).toBe(true);
    const next = await c.setSettings({ autoPill: false, stores: { 'walmart-us': false } });
    expect(next.autoPill).toBe(false);
    expect(next.stores).toEqual({ 'amazon-us': true, 'walmart-us': false });
    expect(await c.getSettings()).toEqual(next);
    await local.set(KEYS.settings, { autoPill: 'maybe', strictness: 99 });
    expect((await c.getSettings()).autoPill).toBe(true);
  });

  it('serialises concurrent patches', async () => {
    const { c } = setup();
    await Promise.all([
      c.setSettings({ autoRings: true }),
      c.setSettings({ singleKeys: false }),
      c.setSettings({ strictness: 'strict' }),
    ]);
    expect(await c.getSettings()).toMatchObject({ autoRings: true, singleKeys: false, strictness: 'strict' });
  });

  it('keeps settings out of session storage and hashes out of local storage', async () => {
    const { c, session, local } = setup();
    await c.setSettings({ autoRings: true });
    await c.hashImages({ store: 'amazon-us', urls: [URL_A] });
    expect(await local.keys()).toEqual([KEYS.settings]);
    expect(await session.keys()).not.toContain(KEYS.settings);
  });
});

describe('query sessions (SPEC F8)', () => {
  it('merges page 2 into page 1', async () => {
    const { c } = setup();
    await c.mergeQuerySession(scan('q:amazon-us:k1', 1, ['a', 'b']));
    const merged = await c.mergeQuerySession(scan('q:amazon-us:k1', 2, ['c']));
    expect(Object.keys(merged.listings).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.pages).toEqual([1, 2]);
  });

  it('returns only the page itself, and stores nothing, when session memory is off', async () => {
    const { c, session } = setup();
    await c.setSettings({ sessionMemory: false });
    await c.mergeQuerySession(scan('q:amazon-us:k1', 1, ['a']));
    const second = await c.mergeQuerySession(scan('q:amazon-us:k1', 2, ['b']));
    expect(Object.keys(second.listings)).toEqual(['b']);
    expect((await session.keys()).filter((k) => k.startsWith('q:'))).toEqual([]);
  });

  it('keeps at most 50 queries, evicting the least recently used (AC-F8.4)', async () => {
    const { c, session, tick } = setup();
    for (let i = 0; i < MAX_QUERY_SESSIONS + 3; i++) {
      tick(10);
      await c.mergeQuerySession(scan(`q:amazon-us:k${i}`, 1, [`id${i}`]));
    }
    const keys = (await session.keys()).filter((k) => k.startsWith('q:'));
    expect(keys).toHaveLength(MAX_QUERY_SESSIONS);
    expect(keys).not.toContain('q:amazon-us:k0');
    expect(keys).toContain(`q:amazon-us:k${MAX_QUERY_SESSIONS + 2}`);
  });

  it('refreshes recency when a query is revisited', async () => {
    const { c, session, tick } = setup();
    for (let i = 0; i < MAX_QUERY_SESSIONS; i++) {
      tick(10);
      await c.mergeQuerySession(scan(`q:amazon-us:k${i}`, 1, [`id${i}`]));
    }
    tick(10);
    await c.mergeQuerySession(scan('q:amazon-us:k0', 2, ['again']));
    tick(10);
    await c.mergeQuerySession(scan('q:amazon-us:new', 1, ['n']));
    const keys = await session.keys();
    expect(keys).toContain('q:amazon-us:k0');
    expect(keys).not.toContain('q:amazon-us:k1');
  });

  it('commits letters only for listings still in the session', async () => {
    const { c, session } = setup();
    await c.mergeQuerySession(scan('q:amazon-us:k1', 1, ['a', 'b']));
    await c.commitLetters({ key: 'q:amazon-us:k1', letters: { a: 'A', b: 'A', gone: 'B' } });
    expect((await session.get<QuerySession>('q:amazon-us:k1'))?.letters).toEqual({ a: 'A', b: 'A' });
    await c.commitLetters({ key: 'q:amazon-us:missing', letters: { a: 'A' } });
  });

  it('clears sessions but keeps the hash cache and counter, with a 10 second undo (AC-F8.3)', async () => {
    const { c, session, tick } = setup();
    await c.hashImages({ store: 'amazon-us', urls: [URL_A] });
    await c.mergeQuerySession(scan('q:amazon-us:k1', 1, ['a']));
    const { undoToken } = await c.clearSessions();
    const keys = await session.keys();
    expect(keys.some((k) => k.startsWith('q:'))).toBe(false);
    expect(keys).toContain(KEYS.hashCache);
    expect(keys).toContain(KEYS.net);
    expect(await c.undoClearSessions({ undoToken })).toBe(true);
    expect(await session.get('q:amazon-us:k1')).not.toBeNull();
    expect(await c.undoClearSessions({ undoToken })).toBe(false); // single use

    const second = await c.clearSessions();
    tick(UNDO_WINDOW_MS + 1);
    expect(await c.undoClearSessions(second)).toBe(false);
    expect(await c.undoClearSessions({ undoToken: 'bogus' })).toBe(false);
  });
});

describe('tab summaries (popup, AC-F9.1)', () => {
  it('stores one summary per tab and forgets it', async () => {
    const { c } = setup();
    const summary = {
      status: 'ready' as const,
      store: 'amazon-us' as const,
      listings: 60,
      products: 37,
      twinGroups: 6,
      maxBrandTaxDollars: 18,
    };
    await c.reportTabSummary(7, summary);
    expect(await c.getTabSummary(7)).toEqual(summary);
    expect(await c.getTabSummary(8)).toBeNull();
    await c.forgetTab(7);
    expect(await c.getTabSummary(7)).toBeNull();
  });
});
