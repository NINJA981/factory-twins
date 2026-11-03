import type { Price } from '../types';

// Number parsing for the strings stores print on result tiles. USD only (SPEC §8.6).

// A dollar sign right after a letter is another currency (CA$12, A$12): not ours.
const MONEY = /(?<![A-Za-z])\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;

/** Reference prices printed next to the price you pay: "Was $20.00", "List: $57.95", "Typical price $30". */
const REFERENCE_PRICE =
  /\b(?:was|list(?:\s+price)?|typical(?:\s+price)?|original(?:\s+price)?|reg(?:ular)?\.?(?:\s+price)?|msrp|compare\s+at)\s*:?\s*(?<![A-Za-z])\$\s?[\d.,]+/gi;

function moneyToNumber(whole: string, frac: string | undefined): number {
  const cents = frac ? Number.parseInt(frac.padEnd(2, '0'), 10) : 0;
  return Number.parseInt(whole.replace(/,/g, ''), 10) + cents / 100;
}

/**
 * Parses "$11.99", "current price $24.99", "Now $9.97", "$1,299.00", "from $12.99" and ranges
 * "$12.99 - $18.99" / "$12.99 to $18.99" (low end, isFromRange). Unit prices such as
 * "($0.42/count)" or "42.0 ¢/oz" and reference prices ("Was $20.00", "List: $57.95") are ignored,
 * in any order. Returns null when no price is shown.
 */
export function parsePrice(text: string | null | undefined): Price | null {
  if (!text) return null;
  const withoutUnit = text
    .replace(/\(\s*\$[\d.,]+\s*\/[^)]*\)/g, ' ')
    .replace(/\$[\d.,]+\s*\/\s*[a-z]+/gi, ' ')
    .replace(REFERENCE_PRICE, ' ');
  const amounts: number[] = [];
  for (const m of withoutUnit.matchAll(MONEY)) amounts.push(moneyToNumber(m[1] as string, m[2]));
  if (amounts.length === 0) return null;
  const first = amounts[0] as number;
  const isRange =
    /\bfrom\b/i.test(withoutUnit) ||
    (amounts.length >= 2 && /\$[\d.,]+\s*(?:-|–|—|to)\s*\$[\d.,]+/i.test(withoutUnit));
  const amount = isRange ? Math.min(...amounts.slice(0, 2)) : first;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount: Math.round(amount * 100) / 100, currency: 'USD', isFromRange: isRange };
}

/** "4.5 out of 5 stars", "4.5 out of 5 Stars. 3918 reviews", "Rated 4.3" → 0..5. */
export function parseRating(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(\d(?:\.\d)?)\s*(?:out of\s*5|\/\s*5|stars?)/i.exec(text) ?? /rated\s*(\d(?:\.\d)?)/i.exec(text);
  if (!m) return null;
  const v = Number.parseFloat(m[1] as string);
  return v >= 0 && v <= 5 ? v : null;
}

/**
 * Review counts: "3,918", "(3,918)", "3918 reviews", "3,918 ratings", "(3.9K)", "1.2M".
 * Abbreviated forms are expanded (3.9K → 3900); callers should prefer an exact source (aria-label)
 * when the tile has one.
 */
export function parseCount(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([kKmM])?(?![\d.])/.exec(text);
  if (!m) return null;
  let v = Number.parseFloat((m[1] as string).replace(/,/g, ''));
  if (m[2]) v *= m[2].toLowerCase() === 'k' ? 1_000 : 1_000_000;
  v = Math.round(v);
  return Number.isFinite(v) && v >= 0 ? v : null;
}
