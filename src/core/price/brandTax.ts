import type { BrandTax, Listing } from '../types';

export interface ComparablePrice {
  id: string;
  /** Dollars; per unit when `perUnit`. */
  value: number;
}

export interface Comparison {
  perUnit: boolean;
  /** Members that take part in the comparison, in input order. */
  prices: ComparablePrice[];
}

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Which members can be compared, and how (SPEC §8.5, §8.6):
 * - members without a price never take part ("No price shown");
 * - members with an uncertain pack count never take part;
 * - when the remaining members' pack counts differ, prices are compared per unit.
 */
export function comparablePrices(members: readonly Listing[]): Comparison {
  const eligible = members.filter((m) => m.price != null && m.packCountCertain);
  const packs = new Set(eligible.map((m) => m.packCount));
  const perUnit = packs.size > 1;
  return {
    perUnit,
    prices: eligible.map((m) => ({
      id: m.id,
      value: perUnit ? (m.price?.amount ?? 0) / m.packCount : (m.price?.amount ?? 0),
    })),
  };
}

/**
 * Brand tax of a twin group: highest minus lowest comparable price, with the cheapest and priciest
 * members (ties go to the earlier member). Null when fewer than two members can be compared.
 */
export function brandTax(members: readonly Listing[]): BrandTax | null {
  const { perUnit, prices } = comparablePrices(members);
  if (prices.length < 2) return null;
  let low = prices[0] as ComparablePrice;
  let high = prices[0] as ComparablePrice;
  for (const p of prices) {
    if (p.value < low.value) low = p;
    if (p.value > high.value) high = p;
  }
  return { amount: roundCents(high.value - low.value), perUnit, lowId: low.id, highId: high.id };
}

/**
 * Ladder order (SPEC AC-F6.1): by comparable price ascending; members outside the comparison
 * (no price, uncertain pack) follow, in page order.
 */
export function ladderOrder(members: readonly Listing[]): string[] {
  const { prices } = comparablePrices(members);
  const value = new Map(prices.map((p) => [p.id, p.value]));
  const pageOrder = (l: Listing) => l.page * 10_000 + l.position;
  return [...members]
    .sort((a, b) => {
      const va = value.get(a.id);
      const vb = value.get(b.id);
      if (va != null && vb != null && va !== vb) return va - vb;
      if (va != null && vb == null) return -1;
      if (va == null && vb != null) return 1;
      return pageOrder(a) - pageOrder(b);
    })
    .map((m) => m.id);
}

/** Pill figure: the largest group brand tax, rounded down to whole dollars ("up to $23"). */
export function maxBrandTaxDollars(taxes: readonly (BrandTax | null)[]): number | null {
  let max: number | null = null;
  for (const t of taxes) if (t && (max == null || t.amount > max)) max = t.amount;
  return max == null ? null : Math.floor(max + 1e-9);
}
