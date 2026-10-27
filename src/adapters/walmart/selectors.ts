// Walmart.com search results DOM (adapter version 1). SPEC Q2 is still open: the item-id attribute
// and image host are taken from the public page structure and must be confirmed by the spike on a
// live page (AC-F0.5) before the Walmart adapter ships.

export const WALMART = {
  resultsContainer: ['[data-testid="item-stack"]', '#results-container', '[data-testid="search-results"]'],
  tile: '[data-item-id]',
  productLink: 'a[link-identifier], a[href*="/ip/"]',
  image: 'img[data-testid="productTileImage"], img',
  title: '[data-automation-id="product-title"]',
  brand: '[data-automation-id="product-brand"]',
  price: '[data-automation-id="product-price"]',
  priceA11y:
    '[data-automation-id="product-price"] .w_iUH7, [data-automation-id="product-price"] [class*="sr-only"]',
  ratingValue: '[data-testid="product-ratings"]',
  reviewValue: '[data-testid="product-reviews"]',
  carousel:
    '[data-testid="carousel-container"], [data-testid="horizontal-scroller"], [role="region"][aria-roledescription="carousel"]',
} as const;

export const ITEM_ID = /^\d{5,15}$/;
