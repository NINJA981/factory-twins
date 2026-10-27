import type { ImageHashes, Listing, Price } from '../../../src/core/types';

type ListingOverrides = Omit<Partial<Listing>, 'price'> & { id: string; price?: number | Price | null };

/** A listing with sensible defaults; `price` may be a bare number of dollars. */
export function listing(over: ListingOverrides): Listing {
  const { price, ...rest } = over;
  const resolved: Price | null =
    price === undefined
      ? { amount: 10, currency: 'USD', isFromRange: false }
      : typeof price === 'number'
        ? { amount: price, currency: 'USD', isFromRange: false }
        : price;
  return {
    store: 'amazon-us',
    page: 1,
    position: 0,
    url: `https://www.amazon.com/dp/${over.id}`,
    imageUrl: `https://m.media-amazon.com/images/I/${over.id}._AC_UL320_.jpg`,
    title: 'Zexmte Adjustable Laptop Stand for Desk',
    brand: null,
    brandConfidence: 'none',
    packCount: 1,
    packCountCertain: true,
    rating: 4.5,
    reviewCount: 100,
    sponsored: false,
    ...rest,
    price: resolved,
  };
}

/** 64-bit hex with the given bit indexes set (bit 0 is the least significant). */
export function hex64(setBits: readonly number[] = []): string {
  let hi = 0;
  let lo = 0;
  for (const b of setBits) {
    if (b < 32) lo |= 1 << b;
    else hi |= 1 << (b - 32);
  }
  return `${(hi >>> 0).toString(16).padStart(8, '0')}${(lo >>> 0).toString(16).padStart(8, '0')}`;
}

export const COLOR_FLAT = '80'.repeat(48);

/** Hashes whose pHash has the given bits set; dHash and colour are neutral. */
export function hashes(phashBits: readonly number[] = [], over: Partial<ImageHashes> = {}): ImageHashes {
  return { dhash: hex64(), phash: hex64(phashBits), color: COLOR_FLAT, w: 400, h: 400, ...over };
}
