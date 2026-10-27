// Store-shaped HTML for the fixture corpus. The markup follows the structure the adapters read
// (adapter version 1), with the surrounding clutter of real result pages: widgets, strike prices,
// unit prices, sponsored labels, carousels. It is a reconstruction, not a capture.
import type { ListingSpec, PageSpec } from './fixtureSpec';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number) => `$${n.toFixed(2)}`;
const fmtInt = (n: number) => n.toLocaleString('en-US');

export interface ImageUrls {
  /** Absolute URL of the thumbnail a listing displays. */
  (l: ListingSpec, store: PageSpec['store']): string;
}

export const placeholderImageUrl: ImageUrls = (l, store) =>
  store === 'amazon-us'
    ? `https://m.media-amazon.com/images/I/${l.imageId}._AC_UL320_.jpg`
    : `https://i5.walmartimages.com/seo/${l.imageId}.jpeg?odnHeight=180&odnWidth=180&odnBg=FFFFFF`;

function stars(rating: number): string {
  return String(rating).replace('.', '-');
}

function amazonTile(l: ListingSpec, index: number, imageUrl: string): string {
  const aria = l.sponsored ? `Sponsored Ad - ${l.title}` : l.title;
  const brandHeading =
    l.brandStyle === 'heading'
      ? `<div class="a-row a-size-mini"><h2 class="a-size-mini s-line-clamp-1"><span class="a-size-base-plus a-color-base">${esc(l.brand)}</span></h2></div>`
      : '';
  const sponsored = l.sponsored
    ? `<div class="a-row a-spacing-micro"><span class="puis-label-popover puis-sponsored-label-text"><span class="puis-label-popover-default"><span class="a-color-secondary">Sponsored</span></span></span></div>`
    : '';
  const reviews =
    l.rating != null && l.reviews != null
      ? `<div data-cy="reviews-block"><div class="a-row a-size-small"><span aria-label="${l.rating} out of 5 stars"><a class="a-popover-trigger a-declarative" href="#"><i class="a-icon a-icon-star-small a-star-small-${stars(l.rating)}"><span class="a-icon-alt">${l.rating} out of 5 stars</span></i></a></span><span aria-label="${fmtInt(l.reviews)} ratings"><a class="a-link-normal s-underline-text s-underline-link-text" href="#reviews"><span class="a-size-base s-underline-text">${l.reviews >= 1000 ? `${(l.reviews / 1000).toFixed(1)}K` : l.reviews}</span></a></span></div></div>`
      : '';
  let price: string;
  if (l.priceRange) {
    price = `<span class="a-price-range"><span class="a-price" data-a-size="xl" data-a-color="base"><span class="a-offscreen">${fmt(l.priceRange[0])}</span></span><span class="a-price-whole"> - </span><span class="a-price" data-a-size="xl" data-a-color="base"><span class="a-offscreen">${fmt(l.priceRange[1])}</span></span></span>`;
  } else if (l.price != null) {
    price = `<span class="a-price" data-a-size="xl" data-a-color="base"><span class="a-offscreen">${fmt(l.price)}</span><span aria-hidden="true"><span class="a-price-symbol">$</span><span class="a-price-whole">${Math.floor(l.price)}</span></span></span>`;
    if (l.strikePrice) {
      price += ` <span class="a-size-base a-color-secondary">List:</span> <span class="a-price a-text-price" data-a-size="b" data-a-strike="true" data-a-color="secondary"><span class="a-offscreen">${fmt(l.strikePrice)}</span></span>`;
    }
    if (l.unitPriceText)
      price += ` <span class="a-size-base a-color-secondary">${esc(l.unitPriceText)}</span>`;
  } else {
    price = `<span class="a-size-base a-link-normal">See options</span>`;
  }
  const byline =
    l.brandStyle === 'byline'
      ? `<div class="a-row a-size-base a-color-secondary"><span class="a-size-base-plus a-color-secondary">by ${esc(l.brand)}</span></div>`
      : '';
  return `<div role="listitem" data-asin="${l.id}" data-index="${index}" data-component-type="s-search-result" class="sg-col-4-of-24 s-result-item s-asin${l.sponsored ? ' AdHolder' : ''}">
<div class="sg-col-inner"><div class="s-widget-container s-spacing-small"><div data-component-type="s-impression-logger"><div class="puis-card-container s-card-container">
<div class="s-product-image-container"><span data-component-type="s-product-image"><a class="a-link-normal s-no-outline" href="/dp/${l.id}/ref=sr_1_${index}?keywords=x"><img class="s-image" src="${esc(imageUrl)}" alt="${esc(aria)}"></a></span></div>
${sponsored}<div data-cy="title-recipe">${brandHeading}<h2 aria-label="${esc(aria)}" class="a-size-base-plus a-spacing-none a-color-base a-text-normal"><a class="a-link-normal s-line-clamp-2" href="/dp/${l.id}"><span class="a-text-normal">${esc(l.title)}</span></a></h2>${byline}</div>
${reviews}<div data-cy="price-recipe"><div class="a-row a-size-base a-color-base">${price}</div></div>
</div></div></div></div></div>`;
}

function amazonWidgets(): string[] {
  return [
    `<div class="s-widget" data-component-type="s-searchgrid-carousel" data-asin="B0CAROUSEL"><div class="a-carousel-container"><h2 class="a-size-medium-plus">Editorial recommendations</h2><ul class="a-carousel"><li class="a-carousel-card"><a href="/dp/B0CARDONE1"><img class="s-image" src="https://m.media-amazon.com/images/I/editorial1._AC_UL320_.jpg" alt="Editorial card"></a></li></ul></div></div>`,
    `<div class="s-widget" data-component-type="s-impression-logger" data-asin="B0VIDEO001"><div class="a-section"><h2 class="a-size-medium">Video</h2><video class="s-video" poster="https://m.media-amazon.com/images/I/video1._AC_UL320_.jpg"></video></div></div>`,
    `<div class="s-widget" data-component-type="s-related-searches"><h2 class="a-size-medium">Related searches</h2><ul><li><a href="/s?k=stand+riser">stand riser</a></li></ul></div>`,
    `<div class="s-widget" data-component-type="s-messaging-widget"><span class="a-size-base">Overall Pick</span><div><a href="/dp/B0PICKCARD"><img class="s-image" src="https://m.media-amazon.com/images/I/pick1._AC_UL320_.jpg" alt="Overall Pick card"></a></div></div>`,
  ];
}

export function renderAmazonPage(spec: PageSpec, imageUrl: ImageUrls): string {
  const tiles = spec.listings.map((l, i) => amazonTile(l, i + 2, imageUrl(l, spec.store)));
  const widgets = amazonWidgets();
  const out: string[] = [];
  tiles.forEach((t, i) => {
    if (i === 4) out.push(widgets[0] as string);
    if (i === 11) out.push(widgets[1] as string);
    if (i === 18) out.push(widgets[3] as string);
    out.push(t);
  });
  out.push(widgets[2] as string);
  return `<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><title>${esc(spec.query)}</title></head>
<body><div id="a-page"><div id="search"><div class="s-desktop-width-max s-desktop-content">
<span data-component-type="s-search-results" class="rush-component s-latency-cf-section">
<div class="s-main-slot s-result-list s-search-results sg-row">
${out.join('\n')}
</div></span></div></div></div></body></html>
`;
}

function walmartTile(l: ListingSpec, imageUrl: string): string {
  const price =
    l.price != null
      ? `<div data-automation-id="product-price"><div class="mr1 mr2-xl b black lh-solid f5 f4-l" aria-hidden="true">${l.priceRange ? 'From ' : 'current price '}<span class="w_iUH7">${l.priceRange ? `${fmt(l.priceRange[0])} - ${fmt(l.priceRange[1])}` : `current price ${fmt(l.price)}`}</span></div></div>`
      : `<div data-automation-id="product-price"><span class="f6">Options from seller</span></div>`;
  const rating =
    l.rating != null && l.reviews != null
      ? `<div class="flex items-center mt2"><span class="w_iUH7" data-testid="product-ratings" data-value="${l.rating}"><span class="sr-only">${l.rating} out of 5 Stars. ${l.reviews} reviews</span></span><span class="sans-serif gray f7" data-testid="product-reviews" data-value="${l.reviews}">${l.reviews >= 1000 ? `${(l.reviews / 1000).toFixed(1)}k` : l.reviews}</span></div>`
      : '';
  const brand =
    l.brandStyle === 'none'
      ? ''
      : `<div data-automation-id="product-brand" class="b f6 mb0 mt2 black">${esc(l.brand)}</div>`;
  const sponsored = l.sponsored ? `<div class="mb1"><span class="f7 gray">Sponsored</span></div>` : '';
  return `<div role="group" data-item-id="${l.id}" class="mb0 ph0-xl pt0-xl bb b--near-white w-25 pb3-m ph1">
<div class="h-100 pb1-xl pr4-xl pv3 ph1"><a link-identifier="${l.id}" href="/ip/${esc(l.title.replace(/[^A-Za-z0-9]+/g, '-').slice(0, 60))}/${l.id}?classType=REGULAR&amp;athbdg=L1600" class="w-100 h-100 z-1 hide-sibling-opacity absolute"><span class="w_iUH7">${esc(l.title)}</span></a>
<div class="relative"><img data-testid="productTileImage" loading="lazy" src="${esc(imageUrl)}" alt="" class="absolute top-0 left-0"></div>
${sponsored}${price}${brand}<span data-automation-id="product-title" class="normal dark-gray mb0 mt1 lh-title f6 f5-l lh-copy">${esc(l.title)}</span>
${rating}</div></div>`;
}

export function renderWalmartPage(spec: PageSpec, imageUrl: ImageUrls): string {
  const tiles = spec.listings.map((l) => walmartTile(l, imageUrl(l, spec.store)));
  const carousel = `<div data-testid="carousel-container"><div role="group" data-item-id="999000111"><a link-identifier="999000111" href="/ip/Carousel-Item/999000111"><img data-testid="productTileImage" src="https://i5.walmartimages.com/seo/carousel1.jpeg" alt=""></a><span data-automation-id="product-title">Carousel item</span></div></div>`;
  const out: string[] = [];
  tiles.forEach((t, i) => {
    if (i === 8) out.push(carousel);
    out.push(t);
  });
  return `<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><title>${esc(spec.query)}</title></head>
<body><div id="__next"><div data-testid="search-results"><div data-testid="item-stack" class="flex flex-wrap">
${out.join('\n')}
</div></div></div></body></html>
`;
}
