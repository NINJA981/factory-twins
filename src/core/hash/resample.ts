// Area-average resampling over RGBA buffers (SPEC §8.2, AC-F2.1). Pure arithmetic in float64, so
// Node and every browser produce bit-identical results for identical input pixels.

export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Uint8Array | Uint8ClampedArray;
}

/** RGB as float64 (0 to 255), 3 values per pixel, row-major. */
export interface RgbFloatImage {
  width: number;
  height: number;
  data: Float64Array;
}

export function assertRgba(img: RgbaImage): void {
  if (!Number.isInteger(img.width) || !Number.isInteger(img.height) || img.width < 1 || img.height < 1) {
    throw new RangeError(`Invalid image size ${img.width}×${img.height}`);
  }
  if (img.data.length !== img.width * img.height * 4) {
    throw new RangeError(`RGBA buffer length ${img.data.length} does not match ${img.width}×${img.height}`);
  }
}

interface Tap {
  index: number;
  weight: number;
}

/** For each output coordinate, the source cells it covers and their coverage weights (sum 1). */
export function areaTaps(srcLen: number, dstLen: number): Tap[][] {
  const scale = srcLen / dstLen;
  const taps: Tap[][] = [];
  for (let i = 0; i < dstLen; i++) {
    const start = i * scale;
    const end = (i + 1) * scale;
    const list: Tap[] = [];
    let total = 0;
    const last = Math.min(Math.ceil(end), srcLen);
    for (let s = Math.floor(start); s < last; s++) {
      const w = Math.min(end, s + 1) - Math.max(start, s);
      if (w > 0) {
        list.push({ index: s, weight: w });
        total += w;
      }
    }
    for (const t of list) t.weight /= total;
    taps.push(list);
  }
  return taps;
}

const WHITE = 255;

/**
 * Composites the image onto white, letterboxes it (centred) into a white square so aspect-ratio
 * differences between re-uploads do not move the hashes, and area-resamples the square to
 * `dstW × dstH`. The square is virtual: memory stays proportional to the source plus the output.
 */
export function resampleSquare(img: RgbaImage, dstW: number, dstH: number): RgbFloatImage {
  assertRgba(img);
  const side = Math.max(img.width, img.height);
  const ox = Math.floor((side - img.width) / 2);
  const oy = Math.floor((side - img.height) / 2);
  const xt = areaTaps(side, dstW);
  const yt = areaTaps(side, dstH);
  const src = img.data;

  // Horizontal pass over the image's own rows only (rows outside it are pure white).
  const rows = new Float64Array(img.height * dstW * 3);
  for (let y = 0; y < img.height; y++) {
    const rowBase = y * img.width;
    for (let x = 0; x < dstW; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const t of xt[x] as Tap[]) {
        const sx = t.index - ox;
        if (sx < 0 || sx >= img.width) {
          r += WHITE * t.weight;
          g += WHITE * t.weight;
          b += WHITE * t.weight;
          continue;
        }
        const si = (rowBase + sx) * 4;
        const a = (src[si + 3] as number) / 255;
        const inv = WHITE * (1 - a);
        r += ((src[si] as number) * a + inv) * t.weight;
        g += ((src[si + 1] as number) * a + inv) * t.weight;
        b += ((src[si + 2] as number) * a + inv) * t.weight;
      }
      const di = (y * dstW + x) * 3;
      rows[di] = r;
      rows[di + 1] = g;
      rows[di + 2] = b;
    }
  }

  const out = new Float64Array(dstW * dstH * 3);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const t of yt[y] as Tap[]) {
        const sy = t.index - oy;
        if (sy < 0 || sy >= img.height) {
          r += WHITE * t.weight;
          g += WHITE * t.weight;
          b += WHITE * t.weight;
          continue;
        }
        const si = (sy * dstW + x) * 3;
        r += (rows[si] as number) * t.weight;
        g += (rows[si + 1] as number) * t.weight;
        b += (rows[si + 2] as number) * t.weight;
      }
      const di = (y * dstW + x) * 3;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
    }
  }
  return { width: dstW, height: dstH, data: out };
}

/** Rec. 709 luma of gamma-encoded RGB (SPEC §8.2). */
export function toLuma(img: RgbFloatImage): Float64Array {
  const n = img.width * img.height;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] =
      0.2126 * (img.data[i * 3] as number) +
      0.7152 * (img.data[i * 3 + 1] as number) +
      0.0722 * (img.data[i * 3 + 2] as number);
  }
  return out;
}
