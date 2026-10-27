import { describe, expect, it } from 'vitest';
import type { ScanSummary } from '../../src/core/cluster/groups';
import {
  INITIAL_OVERLAY,
  defaultLensPair,
  overlayReducer,
  type OverlayState,
} from '../../src/core/state/overlay';
import { INITIAL_PILL, pillReducer, pillVisible, type PillState } from '../../src/core/state/pill';
import type { TwinGroup } from '../../src/core/types';
import { badgeViews, foldCardView } from '../../src/core/view/groupView';
import { listing } from './helpers/listing';

const summary = (over: Partial<ScanSummary> = {}): ScanSummary => ({
  listings: 60,
  products: 37,
  twinGroups: 6,
  maxBrandTaxDollars: 18,
  pages: [1],
  ...over,
});

describe('pill state machine (AC-F4.2)', () => {
  it('goes idle, scanning, result', () => {
    let s: PillState = INITIAL_PILL;
    s = pillReducer(s, { type: 'scan-start', total: 60 });
    expect(s).toEqual({ kind: 'scanning', done: 0, total: 60 });
    s = pillReducer(s, { type: 'scan-progress', done: 24 });
    expect(s).toEqual({ kind: 'scanning', done: 24, total: 60 });
    s = pillReducer(s, { type: 'scan-done', summary: summary() });
    expect(s.kind).toBe('result');
    expect(pillVisible(s)).toBe(true);
  });

  it('says no twins when there are none', () => {
    const s = pillReducer(INITIAL_PILL, {
      type: 'scan-done',
      summary: summary({ twinGroups: 0, maxBrandTaxDollars: null }),
    });
    expect(s.kind).toBe('no-twins');
    expect(pillVisible(s)).toBe(true);
  });

  it('progress never goes backwards or past the total', () => {
    let s: PillState = pillReducer(INITIAL_PILL, { type: 'scan-start', total: 10 });
    s = pillReducer(s, { type: 'scan-progress', done: 8 });
    s = pillReducer(s, { type: 'scan-progress', done: 3 });
    expect(s).toMatchObject({ done: 8 });
    s = pillReducer(s, { type: 'scan-progress', done: 99 });
    expect(s).toMatchObject({ done: 10 });
  });

  it('ignores progress outside a scan', () => {
    expect(pillReducer(INITIAL_PILL, { type: 'scan-progress', done: 3 })).toBe(INITIAL_PILL);
  });

  it('shows an error state with the reason, and recovers on a later scan', () => {
    let s = pillReducer(INITIAL_PILL, { type: 'scan-failed', reason: 'unreadable-tiles' });
    expect(s).toEqual({ kind: 'error', reason: 'unreadable-tiles' });
    expect(pillVisible(s)).toBe(true);
    s = pillReducer(s, { type: 'scan-start', total: 5 });
    s = pillReducer(s, { type: 'scan-done', summary: summary() });
    expect(s.kind).toBe('result');
  });

  it('keeps a good result when a later lazy-tile rescan starts or fails', () => {
    const result = pillReducer(INITIAL_PILL, { type: 'scan-done', summary: summary() });
    expect(pillReducer(result, { type: 'scan-start', total: 70 })).toBe(result);
    expect(pillReducer(result, { type: 'scan-failed', reason: 'hasher-failed' })).toBe(result);
  });

  it('shows nothing when paused, and resumes to idle', () => {
    let s = pillReducer(INITIAL_PILL, { type: 'pause' });
    expect(pillVisible(s)).toBe(false);
    expect(pillReducer(s, { type: 'scan-start', total: 5 })).toBe(s);
    expect(pillReducer(s, { type: 'scan-done', summary: summary() })).toBe(s);
    s = pillReducer(s, { type: 'resume' });
    expect(s).toEqual({ kind: 'idle' });
  });

  it('stays dismissed for the rest of the page (AC-F4.4)', () => {
    const dismissed = pillReducer(pillReducer(INITIAL_PILL, { type: 'scan-done', summary: summary() }), {
      type: 'dismiss',
    });
    expect(dismissed).toEqual({ kind: 'dismissed' });
    expect(pillVisible(dismissed)).toBe(false);
    expect(pillReducer(dismissed, { type: 'scan-done', summary: summary() })).toBe(dismissed);
    expect(pillReducer(dismissed, { type: 'resume' })).toBe(dismissed);
  });
});

const group = (letter: string, ids: string[], over: Partial<TwinGroup> = {}): TwinGroup => ({
  letter,
  memberIds: ids,
  medoidId: ids[0] as string,
  brandTax: { amount: 23, perUnit: false, lowId: ids[0] as string, highId: ids[ids.length - 1] as string },
  mostEstablishedId: ids[0] as string,
  pagesSeen: [1],
  ...over,
});

describe('overlay reducer (F5, F6, F7)', () => {
  const groups = [group('A', ['a1', 'a2', 'a3']), group('B', ['b1', 'b2'])];
  const run = (s: OverlayState, a: Parameters<typeof overlayReducer>[1], g = groups) =>
    overlayReducer(s, a, g);

  it('toggles rings and fold, but only when there are groups', () => {
    expect(run(INITIAL_OVERLAY, { type: 'toggle-rings' }).rings).toBe(true);
    expect(run({ ...INITIAL_OVERLAY, rings: true }, { type: 'toggle-rings' }).rings).toBe(false);
    expect(run(INITIAL_OVERLAY, { type: 'toggle-rings' }, [])).toBe(INITIAL_OVERLAY);
    expect(run(INITIAL_OVERLAY, { type: 'toggle-fold' }).folded).toBe(true);
    expect(run(INITIAL_OVERLAY, { type: 'toggle-fold' }, [])).toBe(INITIAL_OVERLAY);
    expect(run(INITIAL_OVERLAY, { type: 'set-rings', on: true }, []).rings).toBe(false);
  });

  it('opens the lens on the focused group, else the first, with cheapest and priciest on top and bottom', () => {
    const focused = run(INITIAL_OVERLAY, { type: 'focus-group', letter: 'B' });
    const lens = run(focused, { type: 'open-lens' }).lens;
    expect(lens).toMatchObject({ letter: 'B', top: 'b1', bottom: 'b2', mode: 'onion', blend: 50 });
    expect(run(INITIAL_OVERLAY, { type: 'open-lens' }).lens?.letter).toBe('A');
    expect(run(INITIAL_OVERLAY, { type: 'open-lens' }, []).lens).toBeNull();
  });

  it('falls back to the first two members when there is no brand tax', () => {
    const g = group('C', ['c1', 'c2', 'c3'], { brandTax: null });
    expect(defaultLensPair(g)).toEqual({ top: 'c1', bottom: 'c2' });
    expect(defaultLensPair(group('D', ['only']))).toBeNull();
  });

  it('swaps instead of showing one photo on both sides', () => {
    const open = run(INITIAL_OVERLAY, { type: 'open-lens', letter: 'A' });
    expect(open.lens).toMatchObject({ top: 'a1', bottom: 'a3' });
    expect(run(open, { type: 'lens-pick', side: 'top', id: 'a2' }).lens).toMatchObject({
      top: 'a2',
      bottom: 'a3',
    });
    expect(run(open, { type: 'lens-pick', side: 'top', id: 'a3' }).lens).toMatchObject({
      top: 'a3',
      bottom: 'a1',
    });
    expect(run(open, { type: 'lens-pick', side: 'top', id: 'zzz' })).toBe(open);
    expect(run(open, { type: 'lens-swap' }).lens).toMatchObject({ top: 'a3', bottom: 'a1' });
  });

  it('sets lens mode and clamps the blend between 0 and 100', () => {
    const open = run(INITIAL_OVERLAY, { type: 'open-lens' });
    expect(run(open, { type: 'lens-mode', mode: 'difference' }).lens?.mode).toBe('difference');
    expect(run(open, { type: 'lens-blend', value: 140 }).lens?.blend).toBe(100);
    expect(run(open, { type: 'lens-blend', value: -3 }).lens?.blend).toBe(0);
    expect(run(open, { type: 'lens-nudge', delta: 5 }).lens?.blend).toBe(55);
    expect(
      run(run(open, { type: 'lens-blend', value: 98 }), { type: 'lens-nudge', delta: 25 }).lens?.blend,
    ).toBe(100);
    expect(run(INITIAL_OVERLAY, { type: 'lens-nudge', delta: 5 })).toBe(INITIAL_OVERLAY);
  });

  it('closes the lens on Esc and on close, and does nothing else on Esc', () => {
    const open = run(INITIAL_OVERLAY, { type: 'open-lens' });
    expect(run(open, { type: 'escape' }).lens).toBeNull();
    expect(run(open, { type: 'close-lens' }).lens).toBeNull();
    const ringed = { ...INITIAL_OVERLAY, rings: true };
    expect(run(ringed, { type: 'escape' })).toBe(ringed);
  });

  it('drops references to groups that disappeared after a re-scan', () => {
    const open = run(
      { ...INITIAL_OVERLAY, rings: true, folded: true, focusedLetter: 'B' },
      { type: 'open-lens', letter: 'B' },
    );
    const after = run(open, { type: 'groups-changed' }, [group('A', ['a1', 'a2'])]);
    expect(after).toEqual({
      rings: true,
      folded: true,
      lens: null,
      focusedLetter: null,
      cheatsheet: false,
    });
    expect(run(open, { type: 'groups-changed' }, [])).toEqual({
      rings: false,
      folded: false,
      lens: null,
      focusedLetter: null,
      cheatsheet: false,
    });
    expect(run(open, { type: 'groups-changed' }).lens).toEqual(open.lens);
  });

  it('ignores focus on an unknown group', () => {
    expect(run(INITIAL_OVERLAY, { type: 'focus-group', letter: 'Q' }).focusedLetter).toBeNull();
  });
});

describe('group view models (F5, F6)', () => {
  const listings = Object.fromEntries(
    [
      listing({ id: 'lo', price: 11.99, reviewCount: 3918, rating: 4.5, brand: 'Zexmte', page: 1 }),
      listing({ id: 'mid', price: 19.99, reviewCount: 640, rating: 4.2, page: 1 }),
      listing({ id: 'new', price: 15.99, reviewCount: 2, rating: 5, page: 2, sponsored: true }),
      listing({ id: 'hi', price: 34.99, reviewCount: 212, rating: 4.4, brand: 'ProBrand', page: 1 }),
    ].map((l) => [l.id, l]),
  );
  const g: TwinGroup = {
    letter: 'A',
    memberIds: ['lo', 'new', 'mid', 'hi'],
    medoidId: 'mid',
    brandTax: { amount: 23, perUnit: false, lowId: 'lo', highId: 'hi' },
    mostEstablishedId: 'lo',
    pagesSeen: [1, 2],
  };

  it('builds the fold card with a rung per member', () => {
    const v = foldCardView(g, listings, 1);
    expect(v?.rungs.map((r) => r.id)).toEqual(['lo', 'new', 'mid', 'hi']);
    expect(v).toMatchObject({
      letter: 'A',
      memberCount: 4,
      photoUrl: listings.mid?.imageUrl,
      perUnit: false,
    });
    const byId = Object.fromEntries((v?.rungs ?? []).map((r) => [r.id, r]));
    expect(byId.lo).toMatchObject({
      isLowest: true,
      mostEstablished: true,
      fewReviewsReference: null,
      otherPage: null,
    });
    expect(byId.hi).toMatchObject({ isHighest: true, mostEstablished: false });
    expect(byId.new).toMatchObject({ fewReviewsReference: 3918, otherPage: 2, sponsored: true });
  });

  it('omits members that left the session and refuses a card with fewer than two', () => {
    expect(foldCardView(g, { lo: listings.lo as never }, 1)).toBeNull();
    expect(foldCardView(g, { lo: listings.lo as never, hi: listings.hi as never }, 1)?.rungs).toHaveLength(2);
  });

  it('gives each member a badge with the counts SPEC F5 asks for', () => {
    const b = badgeViews([g], listings, 1);
    expect(b.get('lo')).toEqual({ letter: 'A', members: 4, othersOnPage: 2, pages: 2 });
    expect(b.get('new')).toEqual({ letter: 'A', members: 4, othersOnPage: 3, pages: 2 });
    expect(b.size).toBe(4);
  });
});
