import { describe, expect, it, vi } from 'vitest';
import { chunk, createMutex, debounce, mapPool, type Timers } from '../../src/core/async';
import {
  commandAction,
  lensNudgeDelta,
  resolveKey,
  type KeyContext,
  type KeyInput,
} from '../../src/core/keyboard';
import { emptyCounter, normalizeCounter, recordReads, totalReads, unexpectedHosts } from '../../src/core/net';
import {
  DEFAULT_SETTINGS,
  applySettingsPatch,
  normalizeSettings,
  thresholdsFor,
} from '../../src/core/settings';
import { displayedImageUrl, isTrackingParam, normalizeImageUrl } from '../../src/core/url';

describe('settings (AC-F10.1, AC-F10.2)', () => {
  it('defaults match the spec', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      stores: { 'amazon-us': true, 'walmart-us': true },
      autoPill: true,
      autoRings: false,
      sessionMemory: true,
      singleKeys: true,
      strictness: 'standard',
    });
  });

  it('turns untrusted storage into valid settings', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS);
    const mixed = normalizeSettings({
      autoPill: 'yes',
      autoRings: true,
      strictness: 'wild',
      stores: { 'amazon-us': false, bogus: false },
      extra: 1,
    });
    expect(mixed).toEqual({
      ...DEFAULT_SETTINGS,
      autoRings: true,
      stores: { 'amazon-us': false, 'walmart-us': true },
    });
    expect(mixed).not.toHaveProperty('extra');
  });

  it('applies a partial patch without losing the rest', () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, {
      stores: { 'walmart-us': false },
      strictness: 'strict',
    });
    expect(next.stores).toEqual({ 'amazon-us': true, 'walmart-us': false });
    expect(next.strictness).toBe('strict');
    expect(next.autoPill).toBe(true);
    expect(DEFAULT_SETTINGS.stores['walmart-us']).toBe(true);
  });

  it('maps strictness to thresholds (Strict = pHash <= 4)', () => {
    expect(thresholdsFor({ strictness: 'standard' }).phash).toBe(6);
    expect(thresholdsFor({ strictness: 'strict' }).phash).toBe(4);
  });
});

describe('network counter (AC-F9.3)', () => {
  it('counts reads per host, cache hits, unknowns and blocked URLs', () => {
    const c = recordReads(emptyCounter(), [
      { kind: 'read', host: 'm.media-amazon.com', fromCache: true },
      { kind: 'read', host: 'm.media-amazon.com', fromCache: false },
      { kind: 'read', host: 'i5.walmartimages.com', fromCache: null },
      { kind: 'blocked' },
      { kind: 'cached' },
    ]);
    expect(c).toEqual({
      byHost: { 'm.media-amazon.com': 2, 'i5.walmartimages.com': 1 },
      blocked: 1,
      cacheHits: 1,
      cacheUnknown: 1,
    });
    expect(totalReads(c)).toBe(3);
  });

  it('does not mutate the counter it is given', () => {
    const base = emptyCounter();
    recordReads(base, [{ kind: 'read', host: 'x', fromCache: false }]);
    expect(base).toEqual(emptyCounter());
  });

  it('reports hosts outside the allowlist', () => {
    const c = recordReads(emptyCounter(), [{ kind: 'read', host: 'evil.example', fromCache: false }]);
    expect(unexpectedHosts(c, ['m.media-amazon.com'])).toEqual(['evil.example']);
    expect(unexpectedHosts(emptyCounter(), [])).toEqual([]);
  });

  it('repairs a damaged stored counter', () => {
    expect(normalizeCounter(undefined)).toEqual(emptyCounter());
    expect(
      normalizeCounter({ byHost: { a: 3, b: -1, c: 'x' }, blocked: 2.9, cacheHits: -4, cacheUnknown: 'n' }),
    ).toEqual({
      byHost: { a: 3 },
      blocked: 2,
      cacheHits: 0,
      cacheUnknown: 0,
    });
  });
});

describe('keyboard (AC-F12.1, AC-F12.2)', () => {
  const key = (k: string, over: Partial<KeyInput> = {}): KeyInput => ({
    key: k,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    ...over,
  });
  const ctx = (over: Partial<KeyContext> = {}): KeyContext => ({
    singleKeys: true,
    editableFocus: false,
    hasPill: true,
    lensOpen: false,
    ...over,
  });

  it('maps T, F and P', () => {
    expect(resolveKey(key('t'), ctx())).toBe('toggle-rings');
    expect(resolveKey(key('T'), ctx())).toBe('toggle-rings');
    expect(resolveKey(key('f'), ctx())).toBe('toggle-fold');
    expect(resolveKey(key('p'), ctx())).toBe('open-lens');
    expect(resolveKey(key('x'), ctx())).toBeNull();
  });

  it('stays out of the way of typing and of browser shortcuts', () => {
    expect(resolveKey(key('t'), ctx({ editableFocus: true }))).toBeNull();
    expect(resolveKey(key('t'), ctx({ singleKeys: false }))).toBeNull();
    expect(resolveKey(key('t'), ctx({ hasPill: false }))).toBeNull();
    expect(resolveKey(key('t', { ctrlKey: true }), ctx())).toBeNull();
    expect(resolveKey(key('t', { metaKey: true }), ctx())).toBeNull();
    expect(resolveKey(key('t', { altKey: true }), ctx())).toBeNull();
    expect(resolveKey(key('t', { repeat: true }), ctx())).toBeNull();
    expect(resolveKey(key('t', { isComposing: true }), ctx())).toBeNull();
  });

  it('maps arrows to lens nudges only while the lens is open (5% and 25%)', () => {
    const open = ctx({ lensOpen: true });
    expect(resolveKey(key('ArrowRight'), open)).toBe('lens-nudge-small-up');
    expect(resolveKey(key('ArrowLeft'), open)).toBe('lens-nudge-small-down');
    expect(resolveKey(key('ArrowRight', { shiftKey: true }), open)).toBe('lens-nudge-large-up');
    expect(resolveKey(key('ArrowLeft', { shiftKey: true }), open)).toBe('lens-nudge-large-down');
    expect(resolveKey(key('ArrowRight'), ctx())).toBeNull();
    expect(lensNudgeDelta('lens-nudge-small-up')).toBe(5);
    expect(lensNudgeDelta('lens-nudge-large-down')).toBe(-25);
    expect(lensNudgeDelta('toggle-rings')).toBe(0);
  });

  it('keeps Esc and arrows working inside the lens even with single keys off', () => {
    const open = ctx({ lensOpen: true, singleKeys: false, editableFocus: true });
    expect(resolveKey(key('Escape'), open)).toBe('escape');
    expect(resolveKey(key('ArrowRight'), open)).toBe('lens-nudge-small-up');
  });

  it('maps the manifest commands', () => {
    expect(commandAction('ring-twins')).toBe('toggle-rings');
    expect(commandAction('fold-twins')).toBe('toggle-fold');
    expect(commandAction('_execute_action')).toBeNull();
  });
});

describe('image URLs', () => {
  it('strips tracking parameters and fragments but nothing else', () => {
    const u = normalizeImageUrl(
      'https://m.media-amazon.com/images/I/abc._AC_UL320_.jpg?utm_source=x&keep=1&ref=sr#frag',
    );
    expect(u).toBe('https://m.media-amazon.com/images/I/abc._AC_UL320_.jpg?keep=1');
  });
  it('never rewrites a size token', () => {
    const raw = 'https://m.media-amazon.com/images/I/71abc._AC_UL320_.jpg';
    expect(normalizeImageUrl(raw)).toBe(raw);
  });
  it('resolves relative URLs and rejects other schemes', () => {
    expect(normalizeImageUrl('/images/a.jpg', 'https://www.amazon.com/s?k=x')).toBe(
      'https://www.amazon.com/images/a.jpg',
    );
    expect(normalizeImageUrl('data:image/gif;base64,AAAA')).toBeNull();
    expect(normalizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeImageUrl('not a url')).toBeNull();
  });
  it('knows tracking parameters', () => {
    for (const p of ['utm_medium', 'ref', 'pf_rd_p', 'qid', 'crid', 'gclid'])
      expect(isTrackingParam(p)).toBe(true);
    for (const p of ['w', 'height', 'odnHeight', 'id']) expect(isTrackingParam(p)).toBe(false);
  });
  it('picks the URL the browser displayed', () => {
    const el = (attrs: Record<string, string>, currentSrc = '') => ({
      currentSrc,
      getAttribute: (n: string) => attrs[n] ?? null,
    });
    expect(displayedImageUrl(el({ src: 'a' }, 'https://x/current.jpg'))).toBe('https://x/current.jpg');
    expect(displayedImageUrl(el({ src: 'https://x/src.jpg' }))).toBe('https://x/src.jpg');
    expect(
      displayedImageUrl(
        el({ src: 'data:image/gif;base64,AA', srcset: 'https://x/a.jpg 1x, https://x/b.jpg 2x' }),
      ),
    ).toBe('https://x/a.jpg');
    expect(displayedImageUrl(el({ 'data-src': 'https://x/lazy.jpg' }))).toBe('https://x/lazy.jpg');
    expect(displayedImageUrl(el({}))).toBeNull();
  });
});

describe('async helpers', () => {
  it('chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });

  it('mapPool bounds concurrency and keeps order', async () => {
    let live = 0;
    let peak = 0;
    const out = await mapPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      live++;
      peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5 * (8 - n)));
      live--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
    expect(await mapPool([], 4, async (x) => x)).toEqual([]);
    await expect(mapPool([1], 0, async (x) => x)).rejects.toThrow(RangeError);
  });

  it('mutex runs sections one at a time and survives a failing section', async () => {
    const lock = createMutex();
    const log: string[] = [];
    const a = lock(async () => {
      log.push('a start');
      await new Promise((r) => setTimeout(r, 10));
      log.push('a end');
    });
    const b = lock(async () => {
      log.push('b');
      throw new Error('boom');
    });
    const c = lock(async () => {
      log.push('c');
      return 3;
    });
    await a;
    await expect(b).rejects.toThrow('boom');
    expect(await c).toBe(3);
    expect(log).toEqual(['a start', 'a end', 'b', 'c']);
  });

  it('debounce fires once after the quiet period, and can flush or cancel', () => {
    vi.useFakeTimers();
    try {
      const timers: Timers = {
        set: (fn, ms) => setTimeout(fn, ms),
        clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      };
      const fn = vi.fn();
      const d = debounce(fn, 100, timers);
      d();
      d();
      vi.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      d();
      d.flush();
      expect(fn).toHaveBeenCalledTimes(2);
      d();
      d.cancel();
      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
