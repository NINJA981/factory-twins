import { PIXEL_DIFF_BACKGROUND_MIN, PIXEL_DIFF_CHANNEL_THRESHOLD, PIXEL_DIFF_SIZE } from '../constants';
import { resampleSquare, type RgbaImage } from './resample';

export interface PixelDiffResult {
  differing: number;
  /** Pixels compared: every pixel except white background shared by both photos. */
  total: number;
  /** Identical share in tenths of a percent, rounded down (never rounded up to look better). */
  identicalTenths: number;
  /** 1000 − identicalTenths, so the two numbers always add up to 100.0%. */
  differingTenths: number;
}

/**
 * Proof lens measurement (SPEC AC-F7.4): both photos letterboxed and resampled to 256 × 256; a pixel
 * differs when any channel differs by more than 24/255. Pixels that are white in both photos are
 * background and are not counted. 100% is only possible when zero differ.
 */
export function pixelDiff(a: RgbaImage, b: RgbaImage): PixelDiffResult {
  const ra = resampleSquare(a, PIXEL_DIFF_SIZE, PIXEL_DIFF_SIZE).data;
  const rb = resampleSquare(b, PIXEL_DIFF_SIZE, PIXEL_DIFF_SIZE).data;
  const pixels = PIXEL_DIFF_SIZE * PIXEL_DIFF_SIZE;
  let differing = 0;
  let total = 0;
  for (let p = 0; p < pixels; p++) {
    const i = p * 3;
    // Compare at the 8-bit level a display would show, so float noise never counts as a difference.
    const a0 = Math.round(ra[i] as number);
    const a1 = Math.round(ra[i + 1] as number);
    const a2 = Math.round(ra[i + 2] as number);
    const b0 = Math.round(rb[i] as number);
    const b1 = Math.round(rb[i + 1] as number);
    const b2 = Math.round(rb[i + 2] as number);
    const min = PIXEL_DIFF_BACKGROUND_MIN;
    if (a0 >= min && a1 >= min && a2 >= min && b0 >= min && b1 >= min && b2 >= min) continue;
    total++;
    const d = Math.max(Math.abs(a0 - b0), Math.abs(a1 - b1), Math.abs(a2 - b2));
    if (d > PIXEL_DIFF_CHANNEL_THRESHOLD) differing++;
  }
  // Two blank photos: nothing differs.
  const identicalTenths = total === 0 ? 1000 : Math.floor(((total - differing) * 1000) / total);
  return { differing, total, identicalTenths, differingTenths: 1000 - identicalTenths };
}
