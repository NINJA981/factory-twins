// Pack-size parsing (SPEC §8.5): "2 pack", "pack of 3", "set of 4", "x2", "(2-Pack)", "3 count".
//
// Interpretation of "unparseable" used throughout the code: a title that signals a multi-pack
// ("multipack", "value pack", "bulk", "variety pack", conflicting counts) but gives no single
// usable number gets packCount 1 with certain = false. A title that never mentions a pack is a
// single unit, certain. Brand tax only compares members whose pack count is certain.

export interface PackCount {
  count: number;
  certain: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  single: 1,
  two: 2,
  twin: 2,
  double: 2,
  pair: 2,
  three: 3,
  triple: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
};

const NUM = String.raw`(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twin|double|triple)`;

// Pack-family patterns, strongest first. Each captures the count in group 1.
const PACK_PATTERNS: RegExp[] = [
  new RegExp(String.raw`\b${NUM}\s*[- ]?\s*(?:packs?|pk|pks)\b`, 'gi'), // 2 pack, 2-Pack, 2pk, two pack
  new RegExp(String.raw`\b(?:pack|set|box|bundle|case)\s+of\s+${NUM}\b`, 'gi'), // pack of 3, set of 4
  /(?:^|[\s(,])x\s?(\d{1,2})\b(?![.\d]|\s*(?:\d|in\b|inch|cm|mm|ft))/gi, // x2 (not 12x8 inch)
  new RegExp(String.raw`\b${NUM}\s*[- ]?\s*(?:count|ct)\b`, 'gi'), // 3 count, 100ct
];

const MULTI_SIGNALS =
  /\b(multi-?pack|value\s+pack|bulk|variety\s+pack|family\s+pack|combo\s+pack|assorted\s+pack)\b/i;

const MAX_PACK = 500;

function toNumber(raw: string): number | null {
  const lower = raw.toLowerCase();
  if (lower in NUMBER_WORDS) return NUMBER_WORDS[lower] as number;
  const n = Number.parseInt(lower, 10);
  return Number.isFinite(n) ? n : null;
}

export function parsePackCount(title: string): PackCount {
  for (const pattern of PACK_PATTERNS) {
    pattern.lastIndex = 0;
    const found = new Set<number>();
    for (const m of title.matchAll(pattern)) {
      const n = toNumber(m[1] ?? '');
      if (n != null && n >= 1 && n <= MAX_PACK) found.add(n);
    }
    if (found.size === 1) return { count: [...found][0] as number, certain: true };
    if (found.size > 1) return { count: 1, certain: false };
  }
  if (MULTI_SIGNALS.test(title)) return { count: 1, certain: false };
  return { count: 1, certain: true };
}
