import { describe, expect, it } from 'vitest';
import { prepare, twinEdge } from '../../src/core/cluster/edges';
import { cluster, fewReviewsWarnings, mostEstablished } from '../../src/core/cluster/groups';
import { assignLetters, indexForLetter, letterForIndex, twinStyle } from '../../src/core/cluster/letters';
import { UnionFind } from '../../src/core/cluster/unionFind';
import { findVariantFamilies } from '../../src/core/cluster/variants';
import { THRESHOLDS } from '../../src/core/constants';
import type { ImageHashes, Listing } from '../../src/core/types';
import { mulberry32 } from '../../scripts/lib/synth';
import { hashes, hex64, listing } from './helpers/listing';

// "Photo number n": 8 pHash bits set, so two different photos are 16 bits apart (n stays below 8).
const photo = (n: number): ImageHashes => hashes(Array.from({ length: 8 }, (_, i) => n * 8 + i));

describe('UnionFind', () => {
  it('joins and reports components in order', () => {
    const uf = new UnionFind(6);
    expect(uf.union(0, 1)).toBe(true);
    expect(uf.union(1, 0)).toBe(false);
    uf.union(4, 5);
    uf.union(1, 2);
    expect(uf.components()).toEqual([[0, 1, 2], [3], [4, 5]]);
    expect(uf.find(2)).toBe(uf.find(0));
  });
});

describe('twin edge rule (AC-F3.1)', () => {
  const t = THRESHOLDS.standard;
  const a = prepare(listing({ id: 'a', title: 'Plumbrook Laptop Stand' }), hashes());
  it('accepts identical hashes with compatible titles', () => {
    const b = prepare(listing({ id: 'b', title: 'Tessaly Aluminum Laptop Stand' }), hashes());
    expect(twinEdge(a, b, t)).toMatchObject({ twin: true, phash: 0 });
  });
  it('allows pHash 6 and rejects 7', () => {
    const six = prepare(listing({ id: 'b', title: 'Tessaly Laptop Stand' }), hashes([0, 1, 2, 3, 4, 5]));
    const seven = prepare(listing({ id: 'c', title: 'Tessaly Laptop Stand' }), hashes([0, 1, 2, 3, 4, 5, 6]));
    expect(twinEdge(a, six, t).twin).toBe(true);
    expect(twinEdge(a, seven, t)).toEqual({ twin: false, failed: 'phash' });
  });
  it('rejects a dHash distance over 10', () => {
    const far = prepare(listing({ id: 'b', title: 'Tessaly Laptop Stand' }), {
      ...hashes(),
      dhash: hex64(Array.from({ length: 11 }, (_, i) => i)),
    });
    expect(twinEdge(a, far, t)).toEqual({ twin: false, failed: 'dhash' });
  });
  it('rejects a colour signature that is too different', () => {
    const red = prepare(listing({ id: 'b', title: 'Tessaly Laptop Stand' }), {
      ...hashes(),
      color: 'ff'.repeat(48),
    });
    expect(twinEdge(a, red, t)).toEqual({ twin: false, failed: 'color' });
  });
  it('rejects the same photo on unrelated titles', () => {
    const scale = prepare(listing({ id: 'b', title: 'Torvex Digital Kitchen Scale 0.1g' }), hashes());
    expect(twinEdge(a, scale, t)).toEqual({ twin: false, failed: 'title' });
  });
  it('never joins a blank or placeholder photo, even with equal hashes and titles', () => {
    const blank = { ...hashes(), lowInfo: true as const };
    const x = prepare(listing({ id: 'x', title: 'Tessaly Laptop Stand' }), blank);
    const y = prepare(listing({ id: 'y', title: 'Tessaly Laptop Stand' }), blank);
    expect(twinEdge(x, y, t)).toEqual({ twin: false, failed: 'low-info' });
    expect(twinEdge(a, x, t)).toEqual({ twin: false, failed: 'low-info' });
  });
  it('Strict mode tightens pHash to 4', () => {
    const five = prepare(listing({ id: 'b', title: 'Tessaly Laptop Stand' }), hashes([0, 1, 2, 3, 4]));
    expect(twinEdge(a, five, THRESHOLDS.standard).twin).toBe(true);
    expect(twinEdge(a, five, THRESHOLDS.strict).twin).toBe(false);
  });
});

describe('cluster()', () => {
  type Over = Omit<Parameters<typeof listing>[0], 'id'>;
  const stand = (id: string, n: number, extra: Over = {}) => ({
    l: listing({ id, title: `Brand${id} Laptop Stand Adjustable`, brand: `Brand${id}`, ...extra }),
    h: photo(n),
  });
  const run = (items: { l: Listing; h: ImageHashes }[], more: Partial<Parameters<typeof cluster>[0]> = {}) =>
    cluster({
      listings: items.map((i) => i.l),
      hashes: Object.fromEntries(items.map((i) => [i.l.id, i.h])),
      ...more,
    });

  it('groups listings that share a photo and leaves the rest alone', () => {
    const r = run([
      stand('a', 1, { position: 0, price: 12 }),
      stand('b', 2, { position: 1, price: 30 }),
      stand('c', 1, { position: 2, price: 20 }),
      stand('d', 3, { position: 3 }),
      stand('e', 1, { position: 4, price: 35 }),
    ]);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]?.letter).toBe('A');
    expect(r.groups[0]?.memberIds).toEqual(['a', 'c', 'e']);
    expect(r.groups[0]?.brandTax).toEqual({ amount: 23, perUnit: false, lowId: 'a', highId: 'e' });
    expect(r.summary).toMatchObject({ listings: 5, products: 3, twinGroups: 1, maxBrandTaxDollars: 23 });
  });

  it('counts listings without hashes but never groups them', () => {
    const items = [stand('a', 1), stand('b', 1)];
    const r = cluster({
      listings: [...items.map((i) => i.l), listing({ id: 'nohash', title: 'Brandz Laptop Stand' })],
      hashes: { a: items[0]?.h as ImageHashes, b: items[1]?.h as ImageHashes },
    });
    expect(r.summary.listings).toBe(3);
    expect(r.groups[0]?.memberIds).toEqual(['a', 'b']);
  });

  it('does not depend on the order of the input listings', () => {
    const items = [
      stand('a', 1, { position: 0 }),
      stand('b', 1, { position: 1 }),
      stand('c', 2, { position: 2 }),
      stand('d', 2, { position: 3 }),
      stand('e', 3, { position: 4 }),
    ];
    const base = run(items);
    for (let rot = 1; rot < items.length; rot++) {
      const shuffled = [...items.slice(rot), ...items.slice(0, rot)];
      const r = run(shuffled);
      expect(r.groups.map((g) => [g.letter, g.memberIds])).toEqual(
        base.groups.map((g) => [g.letter, g.memberIds]),
      );
      expect(r.summary).toEqual(base.summary);
    }
  });

  it('collapses variant families before grouping (AC-F3.3)', () => {
    const r = run([
      stand('a', 1, { position: 0, brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Adjustable Black' }),
      stand('b', 1, { position: 1, brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Adjustable Silver' }),
    ]);
    expect(r.groups).toHaveLength(0);
    expect(r.variantFamilies).toEqual([{ leaderId: 'a', memberIds: ['a', 'b'] }]);
    expect(r.summary).toMatchObject({ listings: 2, products: 1, twinGroups: 0 });
  });

  it('keeps one variant leader in a twin group with another brand', () => {
    const r = run([
      stand('a', 1, { position: 0, brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Adjustable Black' }),
      stand('b', 1, { position: 1, brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Adjustable Silver' }),
      stand('c', 1, { position: 2, brand: 'Tessaly', title: 'Tessaly Laptop Stand Foldable' }),
    ]);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]?.memberIds).toEqual(['a', 'c']);
    expect(r.summary.products).toBe(1);
  });

  it('splits a long chain whose ends are far from its medoid (AC-F3.2)', () => {
    // Five photos, each 6 bits from the next (every edge passes), so one union-find component.
    // The medoid is the middle one; the ends are 12 bits from it and are split off.
    const step = (n: number) => hashes(Array.from({ length: n * 6 }, (_, i) => i));
    const ids = ['A', 'B', 'C', 'D', 'E'];
    const r = cluster({
      listings: ids.map((id, i) => listing({ id, title: `Brand${id} Laptop Stand`, position: i })),
      hashes: Object.fromEntries(ids.map((id, i) => [id, step(i)])),
    });
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]?.memberIds.sort()).toEqual(['B', 'C', 'D']);
    expect(r.groups[0]?.medoidId).toBe('C');
  });

  it('allows an end-to-end distance up to twice the medoid radius, as the rule is written', () => {
    const A = hashes([]);
    const B = hashes([0, 1, 2, 3, 4, 5]);
    const C = hashes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const r = cluster({
      listings: ['A', 'B', 'C'].map((id, i) =>
        listing({ id, title: `Brand${id} Laptop Stand`, position: i }),
      ),
      hashes: { A, B, C },
    });
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]?.medoidId).toBe('B');
  });

  it('keeps a repeated sponsored listing once, at its earliest sighting', () => {
    const base = stand('a', 1, { page: 1, position: 3 });
    const repeat = stand('a', 1, { page: 3, position: 0 });
    const other = stand('b', 1, { page: 1, position: 5 });
    const r = run([repeat, base, other]);
    expect(r.summary.listings).toBe(2);
    expect(r.groups[0]?.pagesSeen).toEqual([1]);
  });

  it('records the pages a group spans and the pages scanned', () => {
    const r = run([
      stand('a', 1, { page: 1, position: 0 }),
      stand('b', 1, { page: 2, position: 0 }),
      stand('c', 5, { page: 3, position: 0 }),
    ]);
    expect(r.groups[0]?.pagesSeen).toEqual([1, 2]);
    expect(r.summary.pages).toEqual([1, 2, 3]);
  });

  it('picks the member with the most reviews as most established, ties by rating then page order', () => {
    const r = run([
      stand('a', 1, { position: 0, reviewCount: 212, rating: 4.4 }),
      stand('b', 1, { position: 1, reviewCount: 3918, rating: 4.5 }),
      stand('c', 1, { position: 2, reviewCount: 3918, rating: 4.7 }),
      stand('d', 1, { position: 3, reviewCount: 3918, rating: 4.7 }),
    ]);
    expect(r.groups[0]?.mostEstablishedId).toBe('c');
  });

  it('gives a medoid that is a member of the group', () => {
    const r = run([
      stand('a', 1, { position: 0 }),
      stand('b', 1, { position: 1 }),
      stand('c', 1, { position: 2 }),
    ]);
    expect(r.groups[0]?.memberIds).toContain(r.groups[0]?.medoidId);
  });

  it('handles an empty page', () => {
    const r = cluster({ listings: [], hashes: {} });
    expect(r.summary).toEqual({
      listings: 0,
      products: 0,
      twinGroups: 0,
      maxBrandTaxDollars: null,
      pages: [],
    });
  });

  it('clusters 200 listings in 50 ms or less (AC-F3.5)', () => {
    const items: { l: Listing; h: ImageHashes }[] = [];
    const bitsFor = (n: number) => {
      const rnd = mulberry32(n + 1);
      return Array.from({ length: 24 }, () => Math.floor(rnd() * 64));
    };
    for (let i = 0; i < 200; i++) {
      // 70 photos spread over 200 listings: plenty of groups, plenty of near misses.
      const n = i % 70;
      items.push({
        l: listing({
          id: `id${i}`,
          position: i,
          title: `Brand${i} Laptop Stand Foldable`,
          brand: `Brand${i}`,
        }),
        h: hashes(bitsFor(n)),
      });
    }
    // Best of seven: the budget is about the algorithm, not about a busy CI machine.
    let r = run(items);
    let ms = Number.POSITIVE_INFINITY;
    for (let k = 0; k < 7; k++) {
      const t0 = performance.now();
      r = run(items);
      ms = Math.min(ms, performance.now() - t0);
    }
    expect(r.groups.length).toBeGreaterThan(10);
    expect(ms).toBeLessThanOrEqual(50);
  });
});

describe('letters (AC-F3.4)', () => {
  it('counts A to Z then AA, AB', () => {
    expect(letterForIndex(0)).toBe('A');
    expect(letterForIndex(25)).toBe('Z');
    expect(letterForIndex(26)).toBe('AA');
    expect(letterForIndex(27)).toBe('AB');
    expect(letterForIndex(701)).toBe('ZZ');
    expect(letterForIndex(702)).toBe('AAA');
    for (const i of [0, 1, 25, 26, 100, 701, 702, 5000]) expect(indexForLetter(letterForIndex(i))).toBe(i);
    expect(() => letterForIndex(-1)).toThrow(RangeError);
    expect(() => indexForLetter('a1')).toThrow(RangeError);
  });

  it('assigns letters in order of first appearance', () => {
    const { letters } = assignLetters(
      [{ memberIds: ['a', 'b'] }, { memberIds: ['c', 'd'] }, { memberIds: ['e', 'f'] }],
      {},
    );
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('keeps a group on its earlier letter when a new group appears before it', () => {
    const first = assignLetters([{ memberIds: ['a', 'b'] }], {});
    const second = assignLetters([{ memberIds: ['x', 'y'] }, { memberIds: ['a', 'b', 'c'] }], first.map);
    expect(second.letters).toEqual(['B', 'A']);
  });

  it('never recycles the letter of a group that disappeared', () => {
    const first = assignLetters([{ memberIds: ['a', 'b'] }, { memberIds: ['c', 'd'] }], {});
    const second = assignLetters([{ memberIds: ['c', 'd'] }, { memberIds: ['n', 'm'] }], first.map);
    expect(second.letters).toEqual(['B', 'C']);
  });

  it('is stable across re-scans of the same page', () => {
    const items = [
      listing({ id: 'a', position: 0, title: 'Aa Laptop Stand' }),
      listing({ id: 'b', position: 1, title: 'Bb Laptop Stand' }),
      listing({ id: 'c', position: 2, title: 'Cc Laptop Stand' }),
      listing({ id: 'd', position: 3, title: 'Dd Laptop Stand' }),
    ];
    const h = { a: photo(1), b: photo(1), c: photo(2), d: photo(2) };
    const one = cluster({ listings: items, hashes: h });
    const two = cluster({ listings: items, hashes: h, previousLetters: one.letters });
    expect(two.groups.map((g) => g.letter)).toEqual(one.groups.map((g) => g.letter));
  });

  it('gives each of the first 18 letters a distinct colour and pattern pair', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 18; i++) {
      const s = twinStyle(letterForIndex(i));
      seen.add(`${s.slot}/${s.pattern}`);
    }
    expect(seen.size).toBe(18);
    expect(twinStyle('A')).toEqual({ slot: 'a', pattern: 'solid' });
    expect(twinStyle('B')).toEqual({ slot: 'b', pattern: 'dashed' });
  });
});

describe('variant families', () => {
  it('needs the same normalised brand', () => {
    const a = listing({ id: 'a', brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Foldable Black' });
    const b = listing({ id: 'b', brand: 'TESSALY', title: 'Plumbrook Laptop Stand Foldable Silver' });
    expect(findVariantFamilies([a, b])).toEqual([]);
  });
  it('needs a title stem Jaccard of 0.8 or more', () => {
    const a = listing({ id: 'a', brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Foldable Black' });
    const b = listing({ id: 'b', brand: 'Plumbrook', title: 'Plumbrook Laptop Stand Foldable Silver' });
    const c = listing({ id: 'c', brand: 'Plumbrook', title: 'Plumbrook Monitor Arm Clamp Mount Gas Spring' });
    expect(findVariantFamilies([a, b, c])).toEqual([{ leaderId: 'a', memberIds: ['a', 'b'] }]);
  });
  it('ignores listings with no brand', () => {
    const a = listing({ id: 'a', brand: null, title: 'Laptop Stand Foldable Black' });
    const b = listing({ id: 'b', brand: null, title: 'Laptop Stand Foldable Silver' });
    expect(findVariantFamilies([a, b])).toEqual([]);
  });
  it('leads with the earliest listing', () => {
    const a = listing({
      id: 'a',
      brand: 'Plumbrook',
      title: 'Plumbrook Laptop Stand Foldable Black',
      page: 2,
      position: 1,
    });
    const b = listing({
      id: 'b',
      brand: 'Plumbrook',
      title: 'Plumbrook Laptop Stand Foldable Silver',
      page: 1,
      position: 9,
    });
    expect(findVariantFamilies([a, b])[0]?.leaderId).toBe('b');
  });
});

describe('evidence helpers', () => {
  it('mostEstablished skips members without a review count', () => {
    expect(
      mostEstablished([listing({ id: 'a', reviewCount: null }), listing({ id: 'b', reviewCount: 5 })]),
    ).toBe('b');
    expect(mostEstablished([listing({ id: 'a', reviewCount: null })])).toBeNull();
  });

  it('warns about 0 to 9 reviews only when a member has 100 or more (AC-F6.5)', () => {
    const members = [
      listing({ id: 'a', reviewCount: 14203 }),
      listing({ id: 'b', reviewCount: 0 }),
      listing({ id: 'c', reviewCount: 9 }),
      listing({ id: 'd', reviewCount: 10 }),
    ];
    expect(fewReviewsWarnings(members)).toEqual([
      { id: 'b', referenceReviews: 14203 },
      { id: 'c', referenceReviews: 14203 },
    ]);
    expect(
      fewReviewsWarnings([listing({ id: 'a', reviewCount: 99 }), listing({ id: 'b', reviewCount: 1 })]),
    ).toEqual([]);
    expect(
      fewReviewsWarnings([listing({ id: 'a', reviewCount: null }), listing({ id: 'b', reviewCount: null })]),
    ).toEqual([]);
  });
});
