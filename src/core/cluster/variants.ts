import { VARIANT_STEM_JACCARD } from '../constants';
import { normalizeBrand } from '../text/brand';
import { jaccard } from '../text/normalize';
import { titleStem } from '../text/titleSanity';
import type { Listing, VariantFamily } from '../types';
import { comparePageOrder } from './order';
import { UnionFind } from './unionFind';

/**
 * Variant families (SPEC §5, AC-F3.3): listings with the same normalised brand whose title stems
 * (colour, size and pack words removed) have Jaccard ≥ 0.8. They are collapsed to their earliest
 * member before twin grouping and are never a twin group on their own.
 */
export function findVariantFamilies(listings: readonly Listing[]): VariantFamily[] {
  const keys = listings.map((l) => normalizeBrand(l.brand));
  const stems = listings.map((l) => titleStem(l.title, l.brand));
  const uf = new UnionFind(listings.length);
  for (let i = 0; i < listings.length; i++) {
    const ki = keys[i];
    if (!ki) continue;
    for (let j = i + 1; j < listings.length; j++) {
      if (keys[j] !== ki) continue;
      const si = stems[i] as Set<string>;
      const sj = stems[j] as Set<string>;
      if (si.size === 0 || sj.size === 0) continue;
      if (jaccard(si, sj) >= VARIANT_STEM_JACCARD) uf.union(i, j);
    }
  }
  const families: VariantFamily[] = [];
  for (const comp of uf.components()) {
    if (comp.length < 2) continue;
    const members = comp.map((i) => listings[i] as Listing).sort(comparePageOrder);
    families.push({ leaderId: (members[0] as Listing).id, memberIds: members.map((m) => m.id) });
  }
  return families;
}
