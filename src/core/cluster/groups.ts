import { ESTABLISHED_MIN_REVIEWS, FEW_REVIEWS_MAX, THRESHOLDS, type MatchThresholds } from '../constants';
import { hammingBits } from '../hash/hamming';
import { brandTax, ladderOrder, maxBrandTaxDollars } from '../price/brandTax';
import type { ImageHashes, Listing, Strictness, TwinGroup, VariantFamily } from '../types';
import { prepare, twinEdge, type Prepared } from './edges';
import { assignLetters } from './letters';
import { comparePageOrder } from './order';
import { UnionFind } from './unionFind';
import { findVariantFamilies } from './variants';

export interface ClusterInput {
  listings: readonly Listing[];
  /** By listing id. Listings without hashes are counted but never grouped. */
  hashes: Readonly<Record<string, ImageHashes>>;
  strictness?: Strictness;
  /** Listing id → letter from earlier scans of the same query session. */
  previousLetters?: Readonly<Record<string, string>>;
}

export interface ScanSummary {
  listings: number;
  /** Listings minus the extra members of twin groups and variant families (SPEC §5). */
  products: number;
  twinGroups: number;
  /** Largest group brand tax, whole dollars rounded down; null when no group has one. */
  maxBrandTaxDollars: number | null;
  pages: number[];
}

export interface ClusterResult {
  groups: TwinGroup[];
  variantFamilies: VariantFamily[];
  /** Updated listing id → letter map to persist in the query session. */
  letters: Record<string, string>;
  summary: ScanSummary;
}

/** Index of the member with the smallest summed pHash distance to the others (ties: page order). */
function medoidIndex(members: readonly Prepared[]): number {
  let best = 0;
  let bestSum = Number.POSITIVE_INFINITY;
  members.forEach((m, i) => {
    let sum = 0;
    for (const o of members) sum += hammingBits(m.phash, o.phash);
    if (
      sum < bestSum ||
      (sum === bestSum && comparePageOrder(m.listing, (members[best] as Prepared).listing) < 0)
    ) {
      best = i;
      bestSum = sum;
    }
  });
  return best;
}

/** Union-find over twin edges among `items`, then the medoid split (SPEC AC-F3.2), recursively. */
function groupItems(items: readonly Prepared[], t: MatchThresholds, depth = 0): Prepared[][] {
  if (items.length < 2) return [];
  const uf = new UnionFind(items.length);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (twinEdge(items[i] as Prepared, items[j] as Prepared, t).twin) uf.union(i, j);
    }
  }
  const out: Prepared[][] = [];
  for (const comp of uf.components()) {
    if (comp.length < 2) continue;
    let core = comp.map((i) => items[i] as Prepared);
    const splitOff: Prepared[] = [];
    // Shrink until every member is within medoidSplit of the medoid; this stops A~B~C chains.
    for (;;) {
      const med = core[medoidIndex(core)] as Prepared;
      const far = core.filter((m) => hammingBits(m.phash, med.phash) > t.medoidSplit);
      if (far.length === 0) break;
      splitOff.push(...far);
      core = core.filter((m) => !far.includes(m));
    }
    if (core.length >= 2) out.push(core);
    else splitOff.push(...core);
    if (splitOff.length >= 2 && depth < 8) out.push(...groupItems(splitOff, t, depth + 1));
  }
  return out;
}

export function mostEstablished(members: readonly Listing[]): string | null {
  let best: Listing | null = null;
  for (const m of members) {
    if (m.reviewCount == null) continue;
    if (
      !best ||
      m.reviewCount > (best.reviewCount ?? -1) ||
      (m.reviewCount === best.reviewCount && (m.rating ?? -1) > (best.rating ?? -1)) ||
      (m.reviewCount === best.reviewCount && m.rating === best.rating && comparePageOrder(m, best) < 0)
    ) {
      best = m;
    }
  }
  return best?.id ?? null;
}

export interface FewReviewsWarning {
  id: string;
  /** Review count of the most-reviewed member it shares the photo with. */
  referenceReviews: number;
}

/** Members with 0–9 reviews that share a photo with a member having ≥ 100 (SPEC AC-F6.5). */
export function fewReviewsWarnings(members: readonly Listing[]): FewReviewsWarning[] {
  const max = Math.max(-1, ...members.map((m) => m.reviewCount ?? -1));
  if (max < ESTABLISHED_MIN_REVIEWS) return [];
  return members
    .filter((m) => m.reviewCount != null && m.reviewCount <= FEW_REVIEWS_MAX)
    .map((m) => ({ id: m.id, referenceReviews: max }));
}

/**
 * The whole clustering step (SPEC F3): variant collapse, twin edges, union-find, medoid split,
 * evidence (brand tax, most established), stable letters and the pill summary. Pure, and the
 * result does not depend on the order of `input.listings`.
 */
export function cluster(input: ClusterInput): ClusterResult {
  const t = THRESHOLDS[input.strictness ?? 'standard'];
  // One entry per id (a sponsored listing can repeat across pages); the earliest sighting wins.
  const byId = new Map<string, Listing>();
  for (const l of [...input.listings].sort(comparePageOrder)) if (!byId.has(l.id)) byId.set(l.id, l);
  const listings = [...byId.values()];

  const variantFamilies = findVariantFamilies(listings);
  const collapsed = new Set<string>();
  for (const f of variantFamilies) for (const id of f.memberIds) if (id !== f.leaderId) collapsed.add(id);

  const prepared: Prepared[] = [];
  for (const l of listings) {
    const h = input.hashes[l.id];
    if (h && !collapsed.has(l.id)) prepared.push(prepare(l, h));
  }

  const raw = groupItems(prepared, t)
    .map((members) => members.map((m) => m.listing).sort(comparePageOrder))
    .sort((a, b) => comparePageOrder(a[0] as Listing, b[0] as Listing));

  const { letters, map } = assignLetters(
    raw.map((members) => ({ memberIds: members.map((m) => m.id) })),
    input.previousLetters ?? {},
  );

  const preparedById = new Map(prepared.map((p) => [p.listing.id, p]));
  const groups: TwinGroup[] = raw.map((members, gi) => {
    const prep = members.map((m) => preparedById.get(m.id) as Prepared);
    return {
      letter: letters[gi] as string,
      memberIds: ladderOrder(members),
      medoidId: (prep[medoidIndex(prep)] as Prepared).listing.id,
      brandTax: brandTax(members),
      mostEstablishedId: mostEstablished(members),
      pagesSeen: [...new Set(members.map((m) => m.page))].sort((a, b) => a - b),
    };
  });

  let extra = 0;
  for (const f of variantFamilies) extra += f.memberIds.length - 1;
  for (const g of groups) extra += g.memberIds.length - 1;

  return {
    groups,
    variantFamilies,
    letters: map,
    summary: {
      listings: byId.size,
      products: byId.size - extra,
      twinGroups: groups.length,
      maxBrandTaxDollars: maxBrandTaxDollars(groups.map((g) => g.brandTax)),
      pages: [...new Set(listings.map((l) => l.page))].sort((a, b) => a - b),
    },
  };
}
