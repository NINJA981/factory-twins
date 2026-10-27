import { COLOR_GRID, COLOR_SAMPLES_PER_CELL } from '../constants';
import { resampleSquare, type RgbaImage } from './resample';

// Coarse colour signature (SPEC §8.2): mean OKLab of a 4 × 4 grid, 48 numbers quantised to 8 bits.
// OKLab ranges used for quantisation: L in [0, 1]; a and b in [-0.4, 0.4] (covers sRGB).

const AB_RANGE = 0.4;

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function srgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function quantise(v: number, min: number, max: number): number {
  return Math.max(0, Math.min(255, Math.round(((v - min) / (max - min)) * 255)));
}

export function colorSignature(img: RgbaImage): string {
  const n = COLOR_GRID * COLOR_SAMPLES_PER_CELL;
  const small = resampleSquare(img, n, n);
  const sums = new Float64Array(COLOR_GRID * COLOR_GRID * 3);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 3;
      const [L, a, b] = srgbToOklab(
        small.data[i] as number,
        small.data[i + 1] as number,
        small.data[i + 2] as number,
      );
      const cell =
        (Math.floor(y / COLOR_SAMPLES_PER_CELL) * COLOR_GRID + Math.floor(x / COLOR_SAMPLES_PER_CELL)) * 3;
      sums[cell] = (sums[cell] as number) + L;
      sums[cell + 1] = (sums[cell + 1] as number) + a;
      sums[cell + 2] = (sums[cell + 2] as number) + b;
    }
  }
  const per = COLOR_SAMPLES_PER_CELL * COLOR_SAMPLES_PER_CELL;
  let hex = '';
  for (let c = 0; c < COLOR_GRID * COLOR_GRID; c++) {
    const L = (sums[c * 3] as number) / per;
    const a = (sums[c * 3 + 1] as number) / per;
    const b = (sums[c * 3 + 2] as number) / per;
    for (const byte of [
      quantise(L, 0, 1),
      quantise(a, -AB_RANGE, AB_RANGE),
      quantise(b, -AB_RANGE, AB_RANGE),
    ]) {
      hex += byte.toString(16).padStart(2, '0');
    }
  }
  return hex;
}

const COLOR_HEX = /^[0-9a-f]{96}$/;

export function parseColorSignature(hex: string): Uint8Array {
  if (!COLOR_HEX.test(hex)) throw new TypeError('Not a 48-byte colour signature');
  const out = new Uint8Array(48);
  for (let i = 0; i < 48; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Mean per-cell ΔE in OKLab units between two signatures (0 = identical). */
export function colorDistanceBytes(a: Uint8Array, b: Uint8Array): number {
  const cells = COLOR_GRID * COLOR_GRID;
  let total = 0;
  for (let c = 0; c < cells; c++) {
    const dL = ((a[c * 3] as number) - (b[c * 3] as number)) / 255;
    const da = (((a[c * 3 + 1] as number) - (b[c * 3 + 1] as number)) / 255) * 2 * AB_RANGE;
    const db = (((a[c * 3 + 2] as number) - (b[c * 3 + 2] as number)) / 255) * 2 * AB_RANGE;
    total += Math.sqrt(dL * dL + da * da + db * db);
  }
  return total / cells;
}

export function colorDistance(a: string, b: string): number {
  return colorDistanceBytes(parseColorSignature(a), parseColorSignature(b));
}
