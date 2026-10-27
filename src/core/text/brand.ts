import type { BrandConfidence } from '../types';
import { normalizeText, STOPWORDS } from './normalize';

export interface BrandGuess {
  brand: string | null;
  confidence: BrandConfidence;
}

/**
 * Cleans a byline as stores print it: "Visit the Acme Store", "Brand: Acme", "by Acme",
 * "Acme™". Returns the display form (original casing) or null when nothing is left.
 */
export function cleanByline(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^visit the\s+/i, '').replace(/\s+store$/i, '');
  s = s.replace(/^(brand|by|from|sold by)\s*:?\s+/i, '');
  s = s.replace(/^[\s:|,-]+|[\s:|,-]+$/g, '');
  return s.length > 0 && s.length <= 60 ? s : null;
}

/** Comparison key for brands: lowercase, no punctuation or spaces ("Pro-Brand" = "probrand"). */
export function normalizeBrand(brand: string | null | undefined): string | null {
  if (!brand) return null;
  const key = normalizeText(brand).replace(/[\s.]/g, '');
  return key.length > 0 ? key : null;
}

const LEADING_NOISE = /^(?:\[[^\]]*\]|\([^)]*\)|【[^】]*】)\s*/;

/**
 * Low-confidence brand from a title: the first token when it looks like a name (starts with a
 * capital or is all caps, is not a number, not a stopword). Many white-label titles lead with the
 * seller's made-up brand ("ZEXMTE Laptop Stand…"), which is exactly the signal we want.
 */
export function heuristicBrand(title: string): BrandGuess {
  const trimmed = title.replace(LEADING_NOISE, '').trim();
  const first = trimmed.split(/[\s,|:/-]+/)[0] ?? '';
  const clean = first.replace(/[^\p{L}\p{N}&'.+]/gu, '');
  if (clean.length < 2 || /^\d/.test(clean)) return { brand: null, confidence: 'none' };
  if (!/^\p{Lu}/u.test(clean)) return { brand: null, confidence: 'none' };
  if (STOPWORDS.has(clean.toLowerCase())) return { brand: null, confidence: 'none' };
  return { brand: clean, confidence: 'heuristic' };
}

export function resolveBrand(byline: string | null | undefined, title: string): BrandGuess {
  const fromByline = cleanByline(byline);
  if (fromByline) return { brand: fromByline, confidence: 'byline' };
  return heuristicBrand(title);
}
