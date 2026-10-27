// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FoldCardView, Rung } from '../../src/core/view/groupView';
import { twinStyle } from '../../src/core/view/twinStyle';
import { FoldCard, barHeights } from '../../src/overlay/FoldCard';
import { TILE_HOST_TAG, createTileHost, releaseTileHost } from '../../src/overlay/TileLayer';

// The fold card and the tile hosts, rendered with made-up listings (DESIGN.md, Fold card).

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const rung = (over: Partial<Rung>): Rung => ({
  id: 'x',
  url: 'https://store.test/dp/x',
  imageUrl: 'https://img.test/x.jpg',
  brand: 'Brand',
  price: { amount: 10, currency: 'USD', isFromRange: false },
  comparable: 10,
  rating: 4.5,
  reviewCount: 120,
  sponsored: false,
  isLowest: false,
  isHighest: false,
  mostEstablished: false,
  fewReviewsReference: null,
  otherPage: null,
  ...over,
});

function view(rungs: Rung[], over: Partial<FoldCardView> = {}): FoldCardView {
  return {
    letter: 'A',
    memberCount: rungs.length,
    photoUrl: 'https://img.test/photo.jpg',
    perUnit: false,
    brandTax: { amount: 23, perUnit: false, lowId: 'a', highId: 'c' },
    rungs,
    pagesSeen: [1],
    ...over,
  };
}

async function show(v: FoldCardView, gone: string[] = []) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const handlers = { onCheckPixels: vi.fn(), onUnfold: vi.fn(), onFocusGroup: vi.fn() };
  await act(async () => {
    root?.render(<FoldCard view={v} goneIds={new Set(gone)} {...handlers} />);
  });
  return { el: host, ...handlers };
}

const three = () => [
  rung({
    id: 'a',
    brand: 'Berdgio',
    price: { amount: 11.99, currency: 'USD', isFromRange: false },
    comparable: 11.99,
    reviewCount: 3918,
    isLowest: true,
    mostEstablished: true,
  }),
  rung({
    id: 'b',
    brand: 'Mid',
    price: { amount: 19.99, currency: 'USD', isFromRange: false },
    comparable: 19.99,
    sponsored: true,
  }),
  rung({
    id: 'c',
    brand: 'ProBrand',
    price: { amount: 34.99, currency: 'USD', isFromRange: false },
    comparable: 34.99,
    reviewCount: 3,
    isHighest: true,
    fewReviewsReference: 3918,
  }),
];

describe('fold card (AC-F6.1 to AC-F6.6)', () => {
  it('says what the pixels prove and shows the ladder in the order it was given', async () => {
    const { el } = await show(view(three()));
    expect(el.querySelector('h2')?.textContent).toBe('These 3 listings use the same photo');
    expect(el.querySelector('.badge-static')?.textContent).toBe('Twin A ×3');
    const prices = [...el.querySelectorAll('.rung .price')].map((p) => p.textContent);
    expect(prices).toEqual(['$11.99', '$19.99', '$34.99']);
    expect([...el.querySelectorAll('a.rung')].map((a) => a.getAttribute('href'))).toEqual([
      'https://store.test/dp/x',
      'https://store.test/dp/x',
      'https://store.test/dp/x',
    ]);
    // The footnote is the brand promise, and no banned claim appears anywhere in the card.
    expect(el.textContent).toContain('Factory Twins compares photos, not products.');
    expect(el.textContent).not.toMatch(/same item|same product|identical product|dupe|knockoff/i);
  });

  it('tags the brand tax, the lowest and highest rungs and the most established listing', async () => {
    const { el } = await show(view(three()));
    expect(el.querySelector('.tax')?.textContent).toBe('Brand tax +$23.00');
    const bars = [...el.querySelectorAll('.bar')].map((b) => b.textContent);
    expect(bars).toEqual(['Lowest', '', 'Highest']);
    expect(el.querySelector('.tag[data-strong]')?.textContent).toBe('Most established');
    expect(el.textContent).toContain('Sponsored');
  });

  it('warns about a rung with few reviews that shares a photo with a well-reviewed listing (AC-F6.5)', async () => {
    const { el } = await show(view(three()));
    expect(el.querySelector('.note')?.textContent).toBe(
      'Few reviews. Uses the same photo as a listing with 3,918 reviews.',
    );
  });

  it('shows no tax tag when fewer than two members have a price (AC-F6.3)', async () => {
    const rungs = [
      rung({ id: 'a', comparable: 12, price: { amount: 12, currency: 'USD', isFromRange: false } }),
      rung({ id: 'b', comparable: null, price: null }),
    ];
    const { el } = await show(view(rungs, { brandTax: null }));
    expect(el.querySelector('.tax')).toBeNull();
    expect(el.querySelector('.bracket')).toBeNull();
    expect(el.textContent).toContain('No price shown');
  });

  it('says per unit when pack sizes differ, and marks other pages and vanished tiles', async () => {
    const rungs = [
      rung({ id: 'a', comparable: 4.1, price: { amount: 8.2, currency: 'USD', isFromRange: false } }),
      rung({
        id: 'b',
        comparable: 8.2,
        price: { amount: 8.2, currency: 'USD', isFromRange: true },
        otherPage: 2,
      }),
    ];
    const { el } = await show(
      view(rungs, { perUnit: true, brandTax: { amount: 4.1, perUnit: true, lowId: 'a', highId: 'b' } }),
      ['a'],
    );
    expect(el.querySelector('.tax')?.textContent).toBe('Brand tax +$4.10 per unit');
    expect(el.textContent).toContain('per unit');
    expect(el.textContent).toContain('page 2');
    expect(el.textContent).toContain('This listing left the page');
  });

  it('wires the two footer actions and labels the section for screen readers', async () => {
    const { el, onCheckPixels, onUnfold } = await show(view(three()));
    const buttons = [...el.querySelectorAll('.rail button')] as HTMLButtonElement[];
    await act(async () => buttons[0]?.click());
    await act(async () => buttons[1]?.click());
    expect(onCheckPixels).toHaveBeenCalledTimes(1);
    expect(onUnfold).toHaveBeenCalledTimes(1);
    expect(el.querySelector('section')?.getAttribute('aria-label')).toBe(
      'Twin A. These 3 listings use the same photo',
    );
  });

  it('uses only twin tokens for its colours, never the accent', async () => {
    const { el } = await show(view(three()));
    const style = (el.querySelector('section') as HTMLElement).getAttribute('style') ?? '';
    expect(style).toContain('--twin-a');
    expect(style).not.toContain('--accent');
  });
});

describe('ladder bars', () => {
  it('scales between 24 and 96 px by comparable price, and is flat when all prices match', () => {
    expect(barHeights([{ comparable: 10 }, { comparable: 20 }, { comparable: 30 }])).toEqual([24, 60, 96]);
    expect(barHeights([{ comparable: 10 }, { comparable: 10 }])).toEqual([60, 60]);
    expect(barHeights([{ comparable: null }, { comparable: 10 }])).toEqual([null, 60]);
    expect(barHeights([{ comparable: null }])).toEqual([null]);
  });
});

describe('twin styles (AC-F5.1)', () => {
  it('gives each of the first six groups its own colour and pattern, then cycles with a notch rule', () => {
    const first = 'ABCDEF'.split('').map((l) => twinStyle(l));
    expect(new Set(first.map((s) => s.color)).size).toBe(6);
    expect(first.map((s) => s.pattern)).toEqual(['solid', 'dashed', 'dotted', 'double', 'solid', 'dashed']);
    expect(twinStyle('G').color).toBe(twinStyle('A').color);
    expect(twinStyle('G').pattern).not.toBe(twinStyle('A').pattern);
  });
});

describe('tile hosts (AC-F5.3, AC-F6.7)', () => {
  it('puts the host inside the tile and removes every trace on release', () => {
    const tile = document.createElement('div');
    tile.setAttribute('data-asin', 'B0TEST');
    document.body.append(tile);
    const before = tile.outerHTML;
    const rec = createTileHost(tile, 'light');
    expect(tile.querySelector(TILE_HOST_TAG)).toBe(rec.host);
    expect(rec.host.shadowRoot).not.toBeNull();
    releaseTileHost(rec);
    expect(tile.outerHTML).toBe(before);
    tile.remove();
  });
});
