import { fewReviewsWarnings } from '../cluster/groups';
import { comparablePrices } from '../price/brandTax';
import type { Listing, Price, TwinGroup } from '../types';

// View models for the fold card (SPEC F6) and badges (F5). Numbers and flags only; the UI turns
// them into words through src/copy/strings.ts, so the copy lint covers every string.

export interface Rung {
  id: string;
  url: string;
  imageUrl: string;
  brand: string | null;
  price: Price | null;
  /** Comparable price used for ordering and brand tax (per unit when `perUnit`); null when excluded. */
  comparable: number | null;
  rating: number | null;
  reviewCount: number | null;
  sponsored: boolean;
  isLowest: boolean;
  isHighest: boolean;
  mostEstablished: boolean;
  /** Set when this rung has 0–9 reviews and shares the photo with a listing having ≥ 100 (AC-F6.5). */
  fewReviewsReference: number | null;
  /** Page the listing was seen on, when it is not the current page (AC-F8.2). */
  otherPage: number | null;
}

export interface FoldCardView {
  letter: string;
  memberCount: number;
  /** The photo shown on the card: the medoid member's image. */
  photoUrl: string;
  perUnit: boolean;
  brandTax: TwinGroup['brandTax'];
  rungs: Rung[];
  pagesSeen: number[];
}

export function foldCardView(
  group: TwinGroup,
  listings: Readonly<Record<string, Listing>>,
  currentPage: number,
): FoldCardView | null {
  const members = group.memberIds.map((id) => listings[id]).filter((l): l is Listing => l != null);
  if (members.length < 2) return null;
  const { perUnit, prices } = comparablePrices(members);
  const comparable = new Map(prices.map((p) => [p.id, p.value]));
  const warnings = new Map(fewReviewsWarnings(members).map((w) => [w.id, w.referenceReviews]));
  const medoid = listings[group.medoidId] ?? (members[0] as Listing);
  return {
    letter: group.letter,
    memberCount: members.length,
    photoUrl: medoid.imageUrl,
    perUnit,
    brandTax: group.brandTax,
    pagesSeen: group.pagesSeen,
    rungs: members.map((m) => ({
      id: m.id,
      url: m.url,
      imageUrl: m.imageUrl,
      brand: m.brand,
      price: m.price,
      comparable: comparable.get(m.id) ?? null,
      rating: m.rating,
      reviewCount: m.reviewCount,
      sponsored: m.sponsored,
      isLowest: group.brandTax?.lowId === m.id,
      isHighest: group.brandTax?.highId === m.id,
      mostEstablished: group.mostEstablishedId === m.id,
      fewReviewsReference: warnings.get(m.id) ?? null,
      otherPage: m.page === currentPage ? null : m.page,
    })),
  };
}

export interface BadgeView {
  letter: string;
  members: number;
  /** Other members of the group on the current page. */
  othersOnPage: number;
  /** Pages of this query the group was seen on. More than one means "seen N× across P pages". */
  pages: number;
}

/** Badge per listing id, for every member of every group (variants map to their family leader's group). */
export function badgeViews(
  groups: readonly TwinGroup[],
  listings: Readonly<Record<string, Listing>>,
  currentPage: number,
): Map<string, BadgeView> {
  const out = new Map<string, BadgeView>();
  for (const g of groups) {
    const onPage = g.memberIds.filter((id) => listings[id]?.page === currentPage).length;
    for (const id of g.memberIds) {
      out.set(id, {
        letter: g.letter,
        members: g.memberIds.length,
        othersOnPage: Math.max(0, onPage - (listings[id]?.page === currentPage ? 1 : 0)),
        pages: g.pagesSeen.length,
      });
    }
  }
  return out;
}
