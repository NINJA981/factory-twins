// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { readPage } from '../../src/adapters/read';
import { extractWalmartTile } from '../../src/adapters/walmart/extract';
import { parsePrice } from '../../src/core/price/parse';
import { ADAPTERS } from '../../src/adapters/registry';
import type { StoreId } from '../../src/core/types';
import { fixtureDocument, fixtureUrl, loadFixtures } from './helpers/fixtures';

const STORES: StoreId[] = ['amazon-us', 'walmart-us'];

describe.each(STORES)('%s adapter over the fixture corpus', (store) => {
  const fixtures = loadFixtures(store);

  it('has the corpus size SPEC AC-F11.1 asks for', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(store === 'amazon-us' ? 12 : 6);
    const queries = new Set(fixtures.map((f) => f.labels.query));
    expect(queries.size).toBeGreaterThanOrEqual(store === 'amazon-us' ? 8 : 5);
  });

  describe.each(fixtures.map((f) => [f.slug, f] as const))('%s', (_slug, f) => {
    const result = readPage(ADAPTERS[store], fixtureDocument(f), fixtureUrl(f));

    it('has a PROVENANCE.md next to it', async () => {
      const { existsSync } = await import('node:fs');
      expect(existsSync(`${f.dir}/PROVENANCE.md`)).toBe(true);
    });

    it('extracts every product tile (AC-F1.1) and no widget (AC-F1.2)', () => {
      if (!result.ok) throw new Error(`page unreadable: ${result.reason}`);
      expect(new Set(result.listings.map((l) => l.id))).toEqual(new Set(Object.keys(f.hashes)));
      expect(result.listings.every((l) => l.id && l.title && l.imageUrl)).toBe(true);
      expect(result.tiles).toBe(f.labels.tiles);
    });

    it('reads a price wherever the page shows one (AC-F1.1)', () => {
      if (!result.ok) throw new Error('page unreadable');
      expect(result.listings.filter((l) => l.price != null).length).toBe(f.labels.withPrice);
    });

    it('keeps page order and the page number', () => {
      if (!result.ok) throw new Error('page unreadable');
      expect(result.listings.map((l) => l.position)).toEqual(result.listings.map((_, i) => i));
      expect(new Set(result.listings.map((l) => l.page))).toEqual(new Set([f.labels.page]));
    });

    it('only reads images from the store image hosts', () => {
      if (!result.ok) throw new Error('page unreadable');
      const hosts = new Set(result.listings.map((l) => new URL(l.imageUrl).hostname));
      const allowed = store === 'amazon-us' ? ['m.media-amazon.com'] : ['i5.walmartimages.com'];
      expect([...hosts].every((h) => allowed.includes(h))).toBe(true);
    });
  });
});

describe('Walmart price lookup without the generated class name', () => {
  const tile = (priceHtml: string) => {
    const doc = new DOMParser().parseFromString(
      `<div data-item-id="123456789"><a link-identifier="123456789" href="/ip/x/123456789"><span>Tessaly Laptop Stand</span></a>
        <img src="https://i5.walmartimages.com/seo/x.jpeg" />
        <div data-automation-id="product-price">${priceHtml}</div>
        <span data-automation-id="product-title">Tessaly Laptop Stand</span></div>`,
      'text/html',
    );
    return doc.querySelector('[data-item-id]') as Element;
  };

  it('prefers itemprop, then screen-reader text, and reads the whole block last', () => {
    expect(extractWalmartTile(tile('<meta itemprop="price" content="14.97" /><span>$99.00</span>')).priceText).toBe(
      '$14.97',
    );
    expect(
      extractWalmartTile(tile('<span class="sr-only">current price $14.97</span><span>$14.97 Was $19.99</span>'))
        .priceText,
    ).toBe('current price $14.97');
    const blockOnly = extractWalmartTile(tile('<div aria-hidden="true">Now $9.97 Was $12.97</div>'));
    expect(parsePrice(blockOnly.priceText)?.amount).toBe(9.97);
  });
});
