import { displayedImageUrl } from '../../core/url';
import type { RawTile } from '../listing';
import { attrOf, textOf } from '../read';
import { AMAZON, ASIN } from './selectors';

function cleanText(el: Element | null | undefined): string | null {
  const t = el?.textContent?.replace(/\s+/g, ' ').trim();
  return t ? t : null;
}

export function amazonTileId(tile: Element): string | null {
  const asin = tile.getAttribute('data-asin')?.trim().toUpperCase();
  return asin && ASIN.test(asin) ? asin : null;
}

/**
 * Title and byline. Some category layouts print the brand as a short h2 above the title h2 inside
 * the title recipe; the title is the longest heading. A "by Brand" row is the other byline form.
 */
function titleAndByline(tile: Element): { title: string | null; byline: string | null } {
  const scope = tile.querySelector(AMAZON.titleRecipe) ?? tile;
  const headings = [...scope.querySelectorAll<Element>(AMAZON.headings)]
    .map((h): { h: Element; text: string | null } => ({ h, text: cleanText(h) }))
    .filter((x): x is { h: Element; text: string } => x.text != null);
  if (headings.length === 0) return { title: null, byline: null };
  const sorted = [...headings].sort((a, b) => b.text.length - a.text.length);
  const title = (sorted[0] as { text: string }).text.replace(/^Sponsored Ad\s*[-–]\s*/i, '');
  let byline: string | null =
    headings.length > 1 ? (sorted[sorted.length - 1] as { text: string }).text : null;
  if (!byline) {
    for (const row of tile.querySelectorAll(AMAZON.bylineRow)) {
      const t = cleanText(row);
      if (t && /^by\s+/i.test(t) && t.length < 80) {
        byline = t;
        break;
      }
    }
  }
  return { title, byline };
}

function priceText(tile: Element): string | null {
  const range = tile.querySelector(AMAZON.priceRange);
  if (range) {
    const parts = [...range.querySelectorAll('.a-offscreen')].map(cleanText).filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 2).join(' - ');
  }
  return textOf(tile, AMAZON.price);
}

function isSponsored(tile: Element): boolean {
  if (tile.classList.contains('AdHolder')) return true;
  for (const el of tile.querySelectorAll(AMAZON.sponsored)) {
    if (/sponsored/i.test(el.textContent ?? '') || el.matches('[data-component-type="sp-sponsored-result"]'))
      return true;
  }
  const aria = attrOf(tile, 'h2[aria-label]', 'aria-label');
  return aria != null && /^Sponsored Ad/i.test(aria);
}

export function extractAmazonTile(tile: Element): RawTile {
  const id = amazonTileId(tile);
  const img = tile.querySelector<HTMLImageElement>(AMAZON.image);
  const { title, byline } = titleAndByline(tile);
  const ratingText = textOf(tile, AMAZON.ratingAlt) ?? attrOf(tile, AMAZON.ratingAria, 'aria-label');
  const reviewText = attrOf(tile, AMAZON.reviewAria, 'aria-label') ?? textOf(tile, AMAZON.reviewText);
  return {
    id,
    url: id ? `https://www.amazon.com/dp/${id}` : null,
    imageUrl: img ? displayedImageUrl(img) : null,
    title,
    byline,
    priceText: priceText(tile),
    ratingText,
    reviewText,
    sponsored: isSponsored(tile),
  };
}
