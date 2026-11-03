import { PHASH_LOW, PHASH_SIZE } from '../constants';
import { bitsToHex } from './hamming';
import { resampleSquare, toLuma, type RgbaImage } from './resample';

let cosTable: Float64Array | null = null;

/** cos((2x + 1) u π / 2N) for u, x in [0, N). */
function cosines(): Float64Array {
  if (cosTable) return cosTable;
  const n = PHASH_SIZE;
  const t = new Float64Array(n * n);
  for (let u = 0; u < n; u++) {
    for (let x = 0; x < n; x++) t[u * n + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n));
  }
  cosTable = t;
  return t;
}

/** Low-frequency block (PHASH_LOW × PHASH_LOW) of the unnormalised 2-D DCT-II of an N × N signal. */
export function dctLowBlock(signal: Float64Array): Float64Array {
  const n = PHASH_SIZE;
  const k = PHASH_LOW;
  if (signal.length !== n * n) throw new RangeError(`Expected ${n * n} samples`);
  const c = cosines();
  const rowCoef = new Float64Array(n * k);
  for (let y = 0; y < n; y++) {
    for (let u = 0; u < k; u++) {
      let s = 0;
      for (let x = 0; x < n; x++) s += (signal[y * n + x] as number) * (c[u * n + x] as number);
      rowCoef[y * k + u] = s;
    }
  }
  const out = new Float64Array(k * k);
  for (let v = 0; v < k; v++) {
    for (let u = 0; u < k; u++) {
      let s = 0;
      for (let y = 0; y < n; y++) s += (rowCoef[y * k + u] as number) * (c[v * n + y] as number);
      out[v * k + u] = s;
    }
  }
  return out;
}

/**
 * 64-bit perceptual hash (SPEC §8.2): 32 × 32 luma, DCT-II, top-left 8 × 8 block. The DC term is
 * excluded from the median and its bit is always 0; every other bit is coefficient > median.
 */
export function phash(img: RgbaImage): string {
  return phashFromLuma(phashLuma(img));
}

/** The 32 × 32 luma pHash works on (letterboxed onto white). */
export function phashLuma(img: RgbaImage): Float64Array {
  return toLuma(resampleSquare(img, PHASH_SIZE, PHASH_SIZE));
}

/** pHash of luma already computed by `phashLuma`, so callers can reuse it. */
export function phashFromLuma(luma: Float64Array): string {
  const block = dctLowBlock(luma);
  const ac = Array.from(block.subarray(1)).sort((a, b) => a - b);
  const mid = ac.length >> 1;
  const median = ac.length % 2 ? (ac[mid] as number) : ((ac[mid - 1] as number) + (ac[mid] as number)) / 2;
  const bits: boolean[] = [false];
  for (let i = 1; i < block.length; i++) bits.push((block[i] as number) > median);
  return bitsToHex(bits);
}
