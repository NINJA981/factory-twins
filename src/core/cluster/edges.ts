import type { MatchThresholds } from '../constants';
import { colorDistanceBytes, parseColorSignature } from '../hash/color';
import { hammingBits, parseHex64, type Bits64 } from '../hash/hamming';
import { titleFeatures, titlesCompatible, type TitleFeatures } from '../text/titleSanity';
import type { ImageHashes, Listing } from '../types';

/** A listing with its hashes parsed once for the O(n²) edge pass. */
export interface Prepared {
  listing: Listing;
  phash: Bits64;
  dhash: Bits64;
  color: Uint8Array;
  title: TitleFeatures;
}

export function prepare(listing: Listing, hashes: ImageHashes): Prepared {
  return {
    listing,
    phash: parseHex64(hashes.phash),
    dhash: parseHex64(hashes.dhash),
    color: parseColorSignature(hashes.color),
    title: titleFeatures(listing.title, listing.brand),
  };
}

export type EdgeVerdict =
  | { twin: true; phash: number; dhash: number; color: number }
  | { twin: false; failed: 'phash' | 'dhash' | 'color' | 'title' };

/**
 * Twin edge rule (SPEC AC-F3.1): pHash ≤ t.phash AND dHash ≤ t.dhash AND colour distance ≤
 * t.color AND the title sanity check passes. Cheapest test first.
 */
export function twinEdge(a: Prepared, b: Prepared, t: MatchThresholds): EdgeVerdict {
  const p = hammingBits(a.phash, b.phash);
  if (p > t.phash) return { twin: false, failed: 'phash' };
  const d = hammingBits(a.dhash, b.dhash);
  if (d > t.dhash) return { twin: false, failed: 'dhash' };
  const c = colorDistanceBytes(a.color, b.color);
  if (c > t.color) return { twin: false, failed: 'color' };
  if (!titlesCompatible(a.title, b.title)) return { twin: false, failed: 'title' };
  return { twin: true, phash: p, dhash: d, color: c };
}
