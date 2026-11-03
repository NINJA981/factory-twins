// Every matching threshold lives here (SPEC AC-F3.1). Change these only with evidence from the
// fixture corpus (tests/unit/cluster.corpus.test.ts reports precision and recall).

import type { Strictness } from './types';

export interface MatchThresholds {
  /** Max pHash Hamming distance for a twin edge. */
  phash: number;
  /** Max dHash Hamming distance for a twin edge. */
  dhash: number;
  /** Max mean per-cell OKLab distance of the colour signatures for a twin edge. */
  color: number;
  /** A member further than this (pHash) from its group's medoid is split off. */
  medoidSplit: number;
}

export const THRESHOLDS: Record<Strictness, MatchThresholds> = {
  standard: { phash: 6, dhash: 10, color: 0.06, medoidSplit: 8 },
  strict: { phash: 4, dhash: 10, color: 0.06, medoidSplit: 8 },
};

/** Variant family: same normalised brand and title-stem Jaccard at or above this (SPEC §5). */
export const VARIANT_STEM_JACCARD = 0.8;

/** Title sanity: token Jaccard at or above this passes even without a shared head noun (SPEC §8.4). */
export const TITLE_SANITY_JACCARD = 0.2;

/** How many trailing meaningful tokens of a title's first clause count as head nouns. */
export const HEAD_NOUN_WINDOW = 4;

/** Few-reviews warning (SPEC AC-F6.5). */
export const FEW_REVIEWS_MAX = 9;
export const ESTABLISHED_MIN_REVIEWS = 100;

/** Proof lens measurement (SPEC AC-F7.4). */
export const PIXEL_DIFF_SIZE = 256;
export const PIXEL_DIFF_CHANNEL_THRESHOLD = 24;
/**
 * A pixel at or above this in every channel, in both photos, is shared white background (or the
 * letterbox). It is left out of the count, so two different products on white do not read as
 * mostly identical.
 */
export const PIXEL_DIFF_BACKGROUND_MIN = 245;

/**
 * A photo whose luma barely varies (a blank, a flat colour, a loading placeholder) hashes the same
 * as every other such photo, so it says nothing about sameness. Below this standard deviation of
 * 32 × 32 luma (0 to 255) a photo never forms a twin edge.
 */
export const LOW_INFO_LUMA_STD = 3;

/** dHash dead zone in luma units (0 to 255): a bit is 1 only when left exceeds right by more than this. */
export const DHASH_DEAD_ZONE = 4;

/** Hash pipeline sizes (SPEC §8.2). */
export const DHASH_W = 9;
export const DHASH_H = 8;
export const PHASH_SIZE = 32;
export const PHASH_LOW = 8;
export const COLOR_GRID = 4;
/** Each colour-grid cell averages OKLab over this many samples per side. */
export const COLOR_SAMPLES_PER_CELL = 4;

/** Session memory limits (SPEC AC-F8.4, §10). */
export const MAX_QUERY_SESSIONS = 50;
export const MAX_SESSION_BYTES = 200 * 1024;
export const MAX_HASH_CACHE_ENTRIES = 5000;

/** Hasher batching (ADR, scan sequence). */
export const HASH_BATCH_SIZE = 12;
export const HASH_CONCURRENCY = 6;
