// Colour and ring pattern per group letter (DESIGN.md, twin palette). Groups are never told apart by
// colour alone: the letter is the unique key, the pattern the second channel. Pure, so it is tested.

export type TwinColor = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type RingPattern = 'solid' | 'dashed' | 'dotted' | 'double';

export interface TwinStyle {
  color: TwinColor;
  pattern: RingPattern;
  /** Corner notch on the ring (groups E and F). */
  notch: boolean;
}

const COLORS: readonly TwinColor[] = ['a', 'b', 'c', 'd', 'e', 'f'];
const PATTERNS: ReadonlyArray<{ pattern: RingPattern; notch: boolean }> = [
  { pattern: 'solid', notch: false },
  { pattern: 'dashed', notch: false },
  { pattern: 'dotted', notch: false },
  { pattern: 'double', notch: false },
  { pattern: 'solid', notch: true },
  { pattern: 'dashed', notch: true },
];

/** 'A' → 0, 'B' → 1 … 'Z' → 25. Anything else maps to 0. */
export function letterIndex(letter: string): number {
  const code = letter.toUpperCase().charCodeAt(0) - 65;
  return code >= 0 && code < 26 ? code : 0;
}

/**
 * Groups beyond F cycle the palette and shift the pattern, so G reuses A's colour with a dotted
 * ring and the pair (colour, pattern) stays distinct for as long as the letters do.
 */
export function twinStyle(letter: string): TwinStyle {
  const n = letterIndex(letter);
  const color = COLORS[n % COLORS.length] as TwinColor;
  const p = PATTERNS[(n + Math.floor(n / COLORS.length) * 2) % PATTERNS.length] as (typeof PATTERNS)[number];
  return { color, pattern: p.pattern, notch: p.notch };
}
