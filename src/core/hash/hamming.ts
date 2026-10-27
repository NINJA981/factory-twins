// 64-bit hashes are carried as 16 hex characters (JSON-safe). Comparisons parse them once into two
// 32-bit halves so the clustering inner loop is integer-only.

export interface Bits64 {
  hi: number;
  lo: number;
}

const HEX64 = /^[0-9a-f]{16}$/;

export function parseHex64(hex: string): Bits64 {
  if (!HEX64.test(hex)) throw new TypeError(`Not a 64-bit hex hash: ${hex}`);
  return { hi: Number.parseInt(hex.slice(0, 8), 16) >>> 0, lo: Number.parseInt(hex.slice(8), 16) >>> 0 };
}

export function popcount32(v: number): number {
  let x = v >>> 0;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

export function hammingBits(a: Bits64, b: Bits64): number {
  return popcount32(a.hi ^ b.hi) + popcount32(a.lo ^ b.lo);
}

export function hamming(a: string, b: string): number {
  return hammingBits(parseHex64(a), parseHex64(b));
}

/** Packs 64 booleans (index 0 = most significant bit) into 16 hex characters. */
export function bitsToHex(bits: readonly boolean[]): string {
  if (bits.length !== 64) throw new RangeError(`Expected 64 bits, got ${bits.length}`);
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] ? 8 : 0) | (bits[i + 1] ? 4 : 0) | (bits[i + 2] ? 2 : 0) | (bits[i + 3] ? 1 : 0);
    hex += nibble.toString(16);
  }
  return hex;
}
