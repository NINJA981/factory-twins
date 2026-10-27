import { DHASH_DEAD_ZONE, DHASH_H, DHASH_W } from '../constants';
import { bitsToHex } from './hamming';
import { resampleSquare, toLuma, type RgbaImage } from './resample';

/**
 * 64-bit difference hash on a 9 × 8 luma grid (SPEC §8.2): bit = left pixel brighter than its
 * right neighbour by more than a small dead zone, row-major. The dead zone keeps flat white
 * backgrounds from flipping bits on JPEG noise (deviation from the textbook `>`, measured on the
 * synthetic corpus).
 */
export function dhash(img: RgbaImage): string {
  const luma = toLuma(resampleSquare(img, DHASH_W, DHASH_H));
  const bits: boolean[] = [];
  for (let y = 0; y < DHASH_H; y++) {
    for (let x = 0; x < DHASH_W - 1; x++) {
      bits.push((luma[y * DHASH_W + x] as number) - (luma[y * DHASH_W + x + 1] as number) > DHASH_DEAD_ZONE);
    }
  }
  return bitsToHex(bits);
}
