import { displayedImageUrl } from '../../core/url';
import type { RawTile } from '../listing';
import { attrOf, textOf } from '../read';
import { ITEM_ID, WALMART } from './selectors';

const IP_PATH = /\/ip\/(?:[^/?#]+\/)?(\d{5,15})(?:[/?#]|$)/;

export function walmartTileId(tile: Element): string | null {
  const link = tile.querySelector(WALMART.productLink);
  const ident = link?.getAttribute('link-identifier')?.trim();
  if (ident && ITEM_ID.test(ident)) return ident;
  const href = link?.getAttribute('href');
  const m = href ? IP_PATH.exec(href) : null;
  if (m?.[1]) return m[1];
  const dataId = tile.getAttribute('data-item-id')?.trim();
  return dataId && ITEM_ID.test(dataId) ? dataId : null;
}

function isSponsored(tile: Element): boolean {
  for (const el of tile.querySelectorAll('div, span')) {
    if (el.children.length === 0 && el.textContent?.trim() === 'Sponsored') return true;
  }
  return false;
}

function reviewCount(tile: Element): string | null {
  const exact = attrOf(tile, WALMART.reviewValue, 'data-value');
  if (exact) return exact;
  for (const el of tile.querySelectorAll('span')) {
    const m = /([\d,]+)\s+reviews?\b/i.exec(el.textContent ?? '');
    if (m?.[1]) return m[1];
  }
  return null;
}

function rating(tile: Element): string | null {
  const exact = attrOf(tile, WALMART.ratingValue, 'data-value');
  if (exact) return `${exact} out of 5`;
  for (const el of tile.querySelectorAll('span')) {
    const t = el.textContent ?? '';
    if (/out of 5 stars/i.test(t)) return t;
  }
  return null;
}

export function extractWalmartTile(tile: Element): RawTile {
  const id = walmartTileId(tile);
  const img = tile.querySelector<HTMLImageElement>(WALMART.image);
  const link = tile.querySelector(WALMART.productLink);
  const title =
    textOf(tile, WALMART.title) ??
    (link ? textOf(link, 'span') : null) ??
    (link?.textContent?.replace(/\s+/g, ' ').trim() || null);
  return {
    id,
    url: id ? `https://www.walmart.com/ip/${id}` : null,
    imageUrl: img ? displayedImageUrl(img) : null,
    title,
    byline: textOf(tile, WALMART.brand),
    priceText: textOf(tile, WALMART.priceA11y) ?? textOf(tile, WALMART.price),
    ratingText: rating(tile),
    reviewText: reviewCount(tile),
    sponsored: isSponsored(tile),
  };
}
