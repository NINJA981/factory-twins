// Title tokenisation shared by the title sanity check, variant detection and brand heuristics.

/** Words that never identify a product. Kept small and literal so behaviour is predictable. */
export const STOPWORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'for',
  'with',
  'to',
  'in',
  'on',
  'by',
  'at',
  'from',
  'or',
  'as',
  'is',
  'your',
  'you',
  'our',
  'my',
  'its',
  'it',
  'this',
  'that',
  'these',
  'all',
  'any',
  'into',
  'up',
  'out',
  'new',
  'upgraded',
  'upgrade',
  'latest',
  'version',
  'premium',
  'professional',
  'pro',
  'best',
  'top',
  'quality',
  'high',
  'heavy',
  'duty',
  'compatible',
  'fits',
  'fit',
  'use',
  'perfect',
  'ideal',
  'great',
  'gift',
  'gifts',
  'idea',
  'ideas',
  'home',
  'office',
  'kitchen',
  'men',
  'women',
  'kids',
  'adult',
  'adults',
  'set',
  'pack',
  'pcs',
  'pc',
  'piece',
  'pieces',
  'count',
  'ct',
  'pk',
  'x',
  'inch',
  'inches',
  'in',
  'ft',
  'feet',
  'cm',
  'mm',
  'm',
  'oz',
  'lb',
  'lbs',
  'ml',
  'l',
  'g',
  'kg',
  'w',
  'v',
  'mah',
]);

/** Colour words removed from title stems (variants of one listing differ by these). */
export const COLOR_WORDS: ReadonlySet<string> = new Set([
  'black',
  'white',
  'grey',
  'gray',
  'silver',
  'gold',
  'rose',
  'red',
  'blue',
  'navy',
  'green',
  'yellow',
  'orange',
  'pink',
  'purple',
  'brown',
  'beige',
  'clear',
  'transparent',
  'teal',
  'mint',
  'khaki',
  'ivory',
  'cream',
  'dark',
  'light',
  'space',
  'midnight',
  'multicolor',
  'multicolour',
  'colorful',
  'natural',
  'wood',
  'walnut',
  'oak',
  'bamboo',
  'matte',
  'glossy',
]);

/** Size words removed from title stems. */
export const SIZE_WORDS: ReadonlySet<string> = new Set([
  'small',
  'medium',
  'large',
  'xl',
  'xxl',
  'xs',
  's',
  'l',
  'mini',
  'jumbo',
  'big',
  'tiny',
  'extra',
  'regular',
  'standard',
  'size',
  'sizes',
  'long',
  'short',
  'wide',
  'narrow',
  'tall',
]);

/** Lowercase, strip diacritics, trademark signs and punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  // Trademark signs first: NFKD would turn the trademark sign into the letters "TM".
  return input
    .replace(/[™®©]/g, ' ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[™®©]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/(^|\s)\.+|\.+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Minimal English singulariser for product nouns ("stands" → "stand", "batteries" → "battery"). */
export function singularize(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  if (/(ss|us|is|ous)$/.test(word)) return word;
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.slice(0, -2);
  if (/oes$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

export function tokenize(input: string): string[] {
  const norm = normalizeText(input);
  return norm ? norm.split(' ') : [];
}

const NUMBERISH = /^\d+(\.\d+)?[a-z]*$|^[a-z]?\d+[a-z]?$/;

/** Tokens that carry product meaning: not stopwords, not numbers or measurements, singularised. */
export function meaningfulTokens(input: string, exclude: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  for (const t of tokenize(input)) {
    if (STOPWORDS.has(t) || NUMBERISH.test(t) || t.length < 2) continue;
    const s = singularize(t);
    if (exclude.has(s) || exclude.has(t)) continue;
    out.push(s);
  }
  return out;
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
