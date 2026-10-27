import { HEAD_NOUN_WINDOW, TITLE_SANITY_JACCARD } from '../constants';
import { normalizeBrand } from './brand';
import { COLOR_WORDS, jaccard, meaningfulTokens, SIZE_WORDS, tokenize } from './normalize';

function brandTokens(brand: string | null): Set<string> {
  const out = new Set<string>();
  if (!brand) return out;
  for (const t of tokenize(brand)) out.add(t);
  const key = normalizeBrand(brand);
  if (key) out.add(key);
  return out;
}

/** The part of a title before the first clause break, where the product noun usually sits. */
export function firstClause(title: string): string {
  const parts = title.split(/\s[-–—|]\s|[,;:(]|\b(?:for|with|compatible)\b/i);
  return (parts[0] ?? title).trim() || title;
}

export interface TitleFeatures {
  tokens: Set<string>;
  headNouns: Set<string>;
}

/** Lowercased, brand- and stopword-free, singularised tokens plus the head-noun window (SPEC §8.4). */
export function titleFeatures(title: string, brand: string | null): TitleFeatures {
  const exclude = brandTokens(brand);
  const tokens = new Set(meaningfulTokens(title, exclude));
  const clause = meaningfulTokens(firstClause(title), exclude);
  const headNouns = new Set(clause.slice(-HEAD_NOUN_WINDOW));
  return { tokens, headNouns };
}

/**
 * Title sanity check for a twin edge (SPEC §8.4, AC-F3.1): the titles share at least one head-noun
 * token, or their token Jaccard is at least 0.2. Guards against two unrelated products that happen
 * to share a near-blank photo.
 */
export function titlesCompatible(a: TitleFeatures, b: TitleFeatures): boolean {
  for (const t of a.headNouns) if (b.tokens.has(t)) return true;
  for (const t of b.headNouns) if (a.tokens.has(t)) return true;
  return jaccard(a.tokens, b.tokens) >= TITLE_SANITY_JACCARD;
}

/** Title stem for variant detection: meaningful tokens minus colour and size words (SPEC §5). */
export function titleStem(title: string, brand: string | null): Set<string> {
  const exclude = new Set([...brandTokens(brand), ...COLOR_WORDS, ...SIZE_WORDS]);
  return new Set(meaningfulTokens(title, exclude));
}
