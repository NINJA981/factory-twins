// Amazon.com search results DOM (adapter version 1). Selectors are the only store-specific strings;
// keep them here so a layout change is a one-file fix plus a new fixture.

export const AMAZON = {
  resultsContainer: ['.s-main-slot', '.s-search-results', '[data-component-type="s-search-results"]'],
  tile: '[data-component-type="s-search-result"][data-asin]',
  image: 'img.s-image',
  titleRecipe: '[data-cy="title-recipe"]',
  headings: 'h2',
  bylineRow: '.a-row.a-size-base.a-color-secondary',
  priceRange: '.a-price-range',
  price: '.a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
  ratingAlt: '.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt, i[class*="a-star"] .a-icon-alt',
  ratingAria: '[aria-label*="out of 5 stars"]',
  reviewAria: 'a[aria-label$="ratings"], a[aria-label$="rating"], [aria-label$=" ratings"]',
  reviewText: '[data-cy="reviews-block"] .s-underline-text, a[href*="customerReviews"] .s-underline-text',
  sponsored:
    '.puis-sponsored-label-text, .s-sponsored-label-text, .puis-label-popover-default, [data-component-type="sp-sponsored-result"]',
} as const;

export const ASIN = /^[A-Z0-9]{10}$/;
