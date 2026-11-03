// Walmart.com search results DOM (adapter version 1).
//
// UNVERIFIED ON LIVE PAGES. These selectors, the item-id attribute and the image host were written
// from the public page structure and tested only on the synthetic fixtures in tests/fixtures/walmart
// (SPEC Q2, AC-F0.5). Every lookup prefers semantic hooks (data-automation-id, data-testid, itemprop,
// link targets, accessible text) and uses a generated class name only as the last fallback, so a
// class rotation degrades one field instead of breaking the tile.

export const WALMART = {
  resultsContainer: ['[data-testid="item-stack"]', '#results-container', '[data-testid="search-results"]'],
  tile: '[data-item-id]',
  productLink: 'a[link-identifier], a[href*="/ip/"]',
  image: 'img[data-testid="productTileImage"], img',
  title: '[data-automation-id="product-title"]',
  brand: '[data-automation-id="product-brand"]',
  price: '[data-automation-id="product-price"]',
  /** Where the price you pay is written, most reliable first. The whole price block is the fallback. */
  priceSources: [
    '[data-automation-id="product-price"] [class*="sr-only"]',
    // Generated class name: last resort before the whole block.
    '[data-automation-id="product-price"] .w_iUH7',
  ],
  ratingValue: '[data-testid="product-ratings"]',
  reviewValue: '[data-testid="product-reviews"]',
  carousel:
    '[data-testid="carousel-container"], [data-testid="horizontal-scroller"], [role="region"][aria-roledescription="carousel"]',
} as const;

export const ITEM_ID = /^\d{5,15}$/;
