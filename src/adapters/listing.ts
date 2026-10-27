import { parseCount, parsePrice, parseRating } from '../core/price/parse';
import { resolveBrand } from '../core/text/brand';
import { parsePackCount } from '../core/text/packCount';
import type { Listing, StoreId } from '../core/types';
import { normalizeImageUrl } from '../core/url';
import type { TileContext } from './types';

/** Raw strings an adapter pulls out of a tile, before any parsing. */
export interface RawTile {
  id: string | null;
  url: string | null;
  imageUrl: string | null;
  title: string | null;
  byline: string | null;
  priceText: string | null;
  ratingText: string | null;
  /** Prefer an exact source (aria-label "3,918 ratings", data-value) over abbreviated text. */
  reviewText: string | null;
  sponsored: boolean;
}

/** Turns raw tile strings into a Listing; null when id, title or image is missing (AC-F1.1). */
export function buildListing(store: StoreId, raw: RawTile, ctx: TileContext): Listing | null {
  const title = raw.title?.replace(/\s+/g, ' ').trim();
  if (!raw.id || !title || !raw.imageUrl || !raw.url) return null;
  const imageUrl = normalizeImageUrl(raw.imageUrl, ctx.baseUrl);
  if (!imageUrl) return null;
  const brand = resolveBrand(raw.byline, title);
  const pack = parsePackCount(title);
  return {
    id: raw.id,
    store,
    page: ctx.page,
    position: ctx.position,
    url: raw.url,
    imageUrl,
    title,
    brand: brand.brand,
    brandConfidence: brand.confidence,
    price: parsePrice(raw.priceText),
    packCount: pack.count,
    packCountCertain: pack.certain,
    rating: parseRating(raw.ratingText),
    reviewCount: parseCount(raw.reviewText),
    sponsored: raw.sponsored,
  };
}

/** Positive integer page number from a query parameter; 1 when absent or invalid. */
export function pageParam(value: string | null): number {
  const n = value ? Number.parseInt(value, 10) : 1;
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

/** Picks the listed parameters that change the result set (sort, filters). */
export function pickParams(url: URL, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) {
    const v = url.searchParams.get(n);
    if (v) out[n] = v;
  }
  return out;
}
