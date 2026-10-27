// Domain shapes shared by every layer (SPEC §9). Pure types, no runtime code.

export type StoreId = 'amazon-us' | 'walmart-us';

export const STORE_IDS: readonly StoreId[] = ['amazon-us', 'walmart-us'];

export interface Price {
  amount: number;
  currency: 'USD';
  /** True when the tile showed a range ("$12.99 - $18.99"); `amount` is the low end. */
  isFromRange: boolean;
}

export type BrandConfidence = 'byline' | 'heuristic' | 'none';

export interface Listing {
  /** ASIN on Amazon, item id on Walmart. */
  id: string;
  store: StoreId;
  /** Result page number, 1-based. */
  page: number;
  /** Order on its page, 0-based. */
  position: number;
  /** Canonical listing link with tracking stripped. */
  url: string;
  /** The image URL the tile displayed (currentSrc), tracking params stripped, size tokens untouched. */
  imageUrl: string;
  title: string;
  brand: string | null;
  brandConfidence: BrandConfidence;
  price: Price | null;
  /** 1 when unknown. */
  packCount: number;
  packCountCertain: boolean;
  /** 0 to 5. */
  rating: number | null;
  reviewCount: number | null;
  sponsored: boolean;
}

/**
 * Perceptual hashes for one thumbnail.
 *
 * Deviation from SPEC §9: `color` is a 96-character hex string (48 bytes) instead of a
 * `Uint8Array`, because these objects cross `runtime` messaging and `storage.session`, which
 * serialise to JSON and would turn a typed array into a plain object.
 */
export interface ImageHashes {
  /** 64-bit difference hash as 16 hex characters. */
  dhash: string;
  /** 64-bit DCT perceptual hash as 16 hex characters. */
  phash: string;
  /** Mean OKLab of a 4 × 4 grid, quantised to 8 bits per channel, as 96 hex characters. */
  color: string;
  /** Decoded source size. */
  w: number;
  h: number;
}

export interface BrandTax {
  /** Highest minus lowest comparable price, in dollars, rounded to cents. */
  amount: number;
  perUnit: boolean;
  lowId: string;
  highId: string;
}

export interface TwinGroup {
  /** 'A', 'B', … stable per query session. */
  letter: string;
  /** After variant collapse, ordered by comparable price ascending; unpriced members last. */
  memberIds: string[];
  medoidId: string;
  brandTax: BrandTax | null;
  mostEstablishedId: string | null;
  pagesSeen: number[];
}

export interface VariantFamily {
  leaderId: string;
  /** Includes the leader. */
  memberIds: string[];
}

export interface QuerySession {
  key: string;
  store: StoreId;
  query: string;
  listings: Record<string, Listing>;
  /** By listing id. */
  hashes: Record<string, ImageHashes>;
  /** Listing id → letter of the twin group it was last seen in, for letter stability. */
  letters: Record<string, string>;
  /** Pages of this query that have been scanned. */
  pages: number[];
  lastSeen: number;
}

export type Strictness = 'standard' | 'strict';

export interface Settings {
  stores: Record<StoreId, boolean>;
  autoPill: boolean;
  autoRings: boolean;
  sessionMemory: boolean;
  singleKeys: boolean;
  strictness: Strictness;
}

export interface NetworkCounter {
  /** Image reads per host. */
  byHost: Record<string, number>;
  /** URLs refused by the allowlist before any request was made. */
  blocked: number;
  /** Reads the browser reported as served from its HTTP cache. */
  cacheHits: number;
  /** Reads whose cache status the browser did not expose (opaque cross-origin timing). */
  cacheUnknown: number;
}
