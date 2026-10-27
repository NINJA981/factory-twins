import { PIXEL_DIFF_CHANNEL_THRESHOLD, PIXEL_DIFF_SIZE } from '../constants';
import { resampleSquare, type RgbaImage } from './resample';

export interface PixelDiffResult {
  differing: number;
  total: number;
  /** Identical share in tenths of a percent, rounded down (never rounded up to look better). */
  identicalTenths: number;
  /** 1000 − identicalTenths, so the two numbers always add up to 100.0%. */
  differingTenths: number;
}

/**
 * Proof lens measurement (SPEC AC-F7.4): both photos letterboxed and resampled to 256 × 256; a pixel
 * differs when any channel differs by more than 24/255. 100% is only possible when zero differ.
 */
export function pixelDiff(a: RgbaImage, b: RgbaImage): PixelDiffResult {
  const ra = resampleSquare(a, PIXEL_DIFF_SIZE, PIXEL_DIFF_SIZE).data;
  const rb = resampleSquare(b, PIXEL_DIFF_SIZE, PIXEL_DIFF_SIZE).data;
  const total = PIXEL_DIFF_SIZE * PIXEL_DIFF_SIZE;
  let differing = 0;
  for (let p = 0; p < total; p++) {
    const i = p * 3;
    // Compare at the 8-bit level a display would show, so float noise never counts as a difference.
    const d = Math.max(
      Math.abs(Math.round(ra[i] as number) - Math.round(rb[i] as number)),
      Math.abs(Math.round(ra[i + 1] as number) - Math.round(rb[i + 1] as number)),
      Math.abs(Math.round(ra[i + 2] as number) - Math.round(rb[i + 2] as number)),
    );
    if (d > PIXEL_DIFF_CHANNEL_THRESHOLD) differing++;
  }
  const identicalTenths = Math.floor(((total - differing) * 1000) / total);
  return { differing, total, identicalTenths, differingTenths: 1000 - identicalTenths };
}
