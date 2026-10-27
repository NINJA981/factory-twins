import { describe, expect, it } from 'vitest';
import { brandTax, comparablePrices, ladderOrder, maxBrandTaxDollars } from '../../src/core/price/brandTax';
import { parseCount, parsePrice, parseRating } from '../../src/core/price/parse';
import { listing } from './helpers/listing';

describe('parsePrice', () => {
  it.each([
    ['$11.99', 11.99],
    ['current price $24.99', 24.99],
    ['Now $9.97', 9.97],
    ['$1,299.00', 1299],
    ['$7', 7],
    ['$ 8.5', 8.5],
    ['$0.99', 0.99],
  ])('reads %s', (text, amount) => {
    expect(parsePrice(text)).toEqual({ amount, currency: 'USD', isFromRange: false });
  });

  it('reads the low end of a range and flags it', () => {
    expect(parsePrice('$12.99 - $18.99')).toEqual({ amount: 12.99, currency: 'USD', isFromRange: true });
    expect(parsePrice('$12.99 to $18.99')).toEqual({ amount: 12.99, currency: 'USD', isFromRange: true });
    expect(parsePrice('from $12.99')).toEqual({ amount: 12.99, currency: 'USD', isFromRange: true });
  });

  it('ignores unit prices', () => {
    expect(parsePrice('$19.99 ($0.42/count)')?.amount).toBe(19.99);
    expect(parsePrice('($0.42/count)')).toBeNull();
  });

  it('returns null where no price is shown', () => {
    expect(parsePrice('See options')).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice('$0.00')).toBeNull();
  });
});

describe('parseRating and parseCount', () => {
  it('reads star ratings', () => {
    expect(parseRating('4.5 out of 5 stars')).toBe(4.5);
    expect(parseRating('4.3 out of 5 Stars. 1234 reviews')).toBe(4.3);
    expect(parseRating('Rated 4.1')).toBe(4.1);
    expect(parseRating('5 out of 5')).toBe(5);
    expect(parseRating('no stars here')).toBeNull();
    expect(parseRating('7 out of 5 stars')).toBeNull();
    expect(parseRating(null)).toBeNull();
  });

  it('reads exact and abbreviated review counts', () => {
    expect(parseCount('3,918')).toBe(3918);
    expect(parseCount('(3,918)')).toBe(3918);
    expect(parseCount('3918 reviews')).toBe(3918);
    expect(parseCount('3,918 ratings')).toBe(3918);
    expect(parseCount('3.9K')).toBe(3900);
    expect(parseCount('(1.2M)')).toBe(1_200_000);
    expect(parseCount('0')).toBe(0);
    expect(parseCount('new')).toBeNull();
    expect(parseCount('')).toBeNull();
  });
});

describe('brand tax (SPEC AC-F6.3, section 8.5)', () => {
  it('is highest minus lowest price, with the two ends named', () => {
    const members = [
      listing({ id: 'a', price: 11.99 }),
      listing({ id: 'b', price: 34.99 }),
      listing({ id: 'c', price: 19.99 }),
    ];
    expect(brandTax(members)).toEqual({ amount: 23, perUnit: false, lowId: 'a', highId: 'b' });
  });

  it('is null with fewer than two comparable prices', () => {
    expect(brandTax([listing({ id: 'a', price: 10 })])).toBeNull();
    expect(brandTax([listing({ id: 'a', price: 10 }), listing({ id: 'b', price: null })])).toBeNull();
    expect(brandTax([])).toBeNull();
  });

  it('skips unpriced members', () => {
    const t = brandTax([
      listing({ id: 'a', price: 10 }),
      listing({ id: 'b', price: null }),
      listing({ id: 'c', price: 12.5 }),
    ]);
    expect(t).toMatchObject({ amount: 2.5, lowId: 'a', highId: 'c' });
  });

  it('compares per unit when pack sizes differ', () => {
    const t = brandTax([
      listing({ id: 'single', price: 8, packCount: 1 }),
      listing({ id: 'triple', price: 18, packCount: 3 }),
    ]);
    expect(t).toEqual({ amount: 2, perUnit: true, lowId: 'triple', highId: 'single' });
  });

  it('leaves out members whose pack count is uncertain', () => {
    const { prices, perUnit } = comparablePrices([
      listing({ id: 'a', price: 10 }),
      listing({ id: 'b', price: 40, packCountCertain: false }),
      listing({ id: 'c', price: 14 }),
    ]);
    expect(prices.map((p) => p.id)).toEqual(['a', 'c']);
    expect(perUnit).toBe(false);
  });

  it('rounds to cents without floating point drift', () => {
    expect(brandTax([listing({ id: 'a', price: 0.1 }), listing({ id: 'b', price: 0.3 })])?.amount).toBe(0.2);
  });

  it('breaks ties toward the earlier member', () => {
    const t = brandTax([
      listing({ id: 'a', price: 10 }),
      listing({ id: 'b', price: 10 }),
      listing({ id: 'c', price: 20 }),
    ]);
    expect(t).toMatchObject({ lowId: 'a', highId: 'c' });
  });
});

describe('ladderOrder', () => {
  it('sorts by comparable price, unpriced and uncertain members last in page order', () => {
    const order = ladderOrder([
      listing({ id: 'x', price: null, position: 0 }),
      listing({ id: 'hi', price: 30, position: 1 }),
      listing({ id: 'lo', price: 10, position: 2 }),
      listing({ id: 'unsure', price: 5, packCountCertain: false, position: 3 }),
      listing({ id: 'mid', price: 20, position: 4 }),
    ]);
    expect(order).toEqual(['lo', 'mid', 'hi', 'x', 'unsure']);
  });

  it('orders equal prices by page order', () => {
    expect(
      ladderOrder([
        listing({ id: 'b', price: 10, position: 5 }),
        listing({ id: 'a', price: 10, position: 1 }),
      ]),
    ).toEqual(['a', 'b']);
  });
});

describe('maxBrandTaxDollars (the pill figure)', () => {
  it('rounds the largest tax down to whole dollars', () => {
    expect(
      maxBrandTaxDollars([
        { amount: 18.99, perUnit: false, lowId: 'a', highId: 'b' },
        { amount: 4, perUnit: false, lowId: 'c', highId: 'd' },
        null,
      ]),
    ).toBe(18);
  });
  it('is null when no group has a tax', () => {
    expect(maxBrandTaxDollars([null, null])).toBeNull();
    expect(maxBrandTaxDollars([])).toBeNull();
  });
  it('does not lose a dollar to floating point', () => {
    expect(maxBrandTaxDollars([{ amount: 23, perUnit: false, lowId: 'a', highId: 'b' }])).toBe(23);
    expect(maxBrandTaxDollars([{ amount: 0.1 + 0.2 + 22.7, perUnit: false, lowId: 'a', highId: 'b' }])).toBe(
      23,
    );
  });
});
