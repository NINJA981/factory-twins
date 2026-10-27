import type { Listing } from '../types';

/** Page order: page first, then position on the page. Used for every "earliest" tie-break. */
export function comparePageOrder(
  a: Pick<Listing, 'page' | 'position'>,
  b: Pick<Listing, 'page' | 'position'>,
): number {
  return a.page - b.page || a.position - b.position;
}
