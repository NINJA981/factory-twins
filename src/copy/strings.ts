// Every user-facing string lives here (SPEC AC-X.1). tests/unit/copy.test.ts scans this file for
// banned phrases and placeholder text. Rule: claim only what the pixels prove ("same photo").

import type { ScanSummary } from '../core/cluster/groups';
import type { StoreId } from '../core/types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const count = new Intl.NumberFormat('en-US');

export function formatPrice(amount: number): string {
  return usd.format(amount);
}

export function formatWholeDollars(amount: number): string {
  return usdWhole.format(Math.floor(amount));
}

export function formatCount(n: number): string {
  return count.format(n);
}

function plural(n: number, one: string, many: string): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

export const STORE_NAMES: Record<StoreId, string> = {
  'amazon-us': 'Amazon',
  'walmart-us': 'Walmart',
};

/** Pill segments in result state; the UI draws dividers between them (no middle dots in text). */
export function pillSegments(s: ScanSummary): string[] {
  const listings =
    s.pages.length > 1
      ? `${plural(s.listings, 'listing', 'listings')} across ${s.pages.length} pages`
      : plural(s.listings, 'listing', 'listings');
  const segments = [`${listings} → ${plural(s.products, 'product', 'products')}`];
  segments.push(plural(s.twinGroups, 'twin group', 'twin groups'));
  if (s.maxBrandTaxDollars != null && s.maxBrandTaxDollars > 0) {
    segments.push(`up to ${formatWholeDollars(s.maxBrandTaxDollars)} brand tax`);
  }
  return segments;
}

/** Accessible name of the pill (SPEC AC-F4.1): spoken numbers, no arrow, dollars spelled out. */
export function pillAccessibleName(s: ScanSummary): string {
  const parts = [
    s.pages.length > 1
      ? `${plural(s.listings, 'listing', 'listings')} across ${s.pages.length} pages`
      : plural(s.listings, 'listing', 'listings'),
    plural(s.products, 'product', 'products'),
    plural(s.twinGroups, 'twin group', 'twin groups'),
  ];
  if (s.maxBrandTaxDollars != null && s.maxBrandTaxDollars > 0) {
    parts.push(`up to ${plural(s.maxBrandTaxDollars, 'dollar', 'dollars')} brand tax`);
  }
  return `${parts.join(', ')}. Show twins.`;
}

export function pillScanning(done: number, total: number): string {
  return `Checking ${plural(total, 'photo', 'photos')}… ${formatCount(done)}/${formatCount(total)}`;
}

export function pillNoTwins(listings: number): string {
  return `${plural(listings, 'listing', 'listings')}, no shared photos on this page`;
}

export const PILL_ERROR = "Couldn't read this page's listings. The store may have changed its layout.";
export const REPORT_LAYOUT = 'Report layout';
export const HIDE_FOR_PAGE = 'Hide for this page';
export const FOLD_TWINS = 'Fold twins';
export const UNFOLD_TWINS = 'Unfold twins';
export const SHOW_TWINS = 'Show twins';

export function badgeLabel(letter: string, members: number): string {
  return `Twin ${letter} ×${formatCount(members)}`;
}

export function sameAsOthers(others: number): string {
  return `Same photo as ${plural(others, 'other listing', 'other listings')} on this page`;
}

export function seenAcrossPages(times: number, pages: number): string {
  return `Same photo on ${formatCount(times)} listings across ${plural(pages, 'page', 'pages')}`;
}

export function foldHeader(members: number): string {
  return `These ${formatCount(members)} listings use the same photo`;
}

export function brandTaxTag(amount: number, perUnit: boolean): string {
  return `Brand tax +${formatPrice(amount)}${perUnit ? ' per unit' : ''}`;
}

export function fewReviewsNote(referenceReviews: number): string {
  return `Few reviews. Uses the same photo as a listing with ${plural(referenceReviews, 'review', 'reviews')}.`;
}

export function variantsChip(n: number): string {
  return `${formatCount(n)} variants`;
}

export const VARIANTS_OF_ONE = 'Variants of one listing';
export const MOST_ESTABLISHED = 'Most established';
export const NO_PRICE = 'No price shown';
export const PER_UNIT = 'per unit';
export const FROM = 'from';
export const SPONSORED = 'Sponsored';
export const LOWEST = 'Lowest';
export const HIGHEST = 'Highest';
export const LISTING_LEFT = 'This listing left the page';
export const FOLD_FOOTNOTE = 'Factory Twins compares photos, not products.';

export function pageChip(page: number): string {
  return `page ${formatCount(page)}`;
}

export function reviewsLabel(n: number): string {
  return plural(n, 'review', 'reviews');
}

export function foldAnnouncement(groups: number): string {
  return `Folded ${plural(groups, 'twin group', 'twin groups')}.`;
}

// Proof lens
export const LENS_TITLE = 'Check the pixels';
export const LENS_TOP = 'Top photo';
export const LENS_BOTTOM = 'Bottom photo';
export const LENS_ONION = 'Onion skin';
export const LENS_DIFFERENCE = 'Difference';
export const LENS_SWAP = 'Swap photos';
export const LENS_METHOD =
  'Measured on both photos at 256 × 256. A pixel differs when any colour channel changes by more than 24 of 255.';
export const LENS_IDENTICAL_ALL = 'No pixel differs.';
export const LENS_DIFFERENT = 'These photos differ in places. Look at the bright areas in Difference mode.';
export const LENS_ERROR = "Couldn't read one of these photos. The store's image server didn't return it.";
export const TRY_AGAIN = 'Try again';

function tenths(t: number): string {
  return t % 10 === 0 ? `${t / 10}` : (t / 10).toFixed(1);
}

export function lensReadout(identicalTenths: number): string {
  return `${tenths(identicalTenths)}%`;
}

export function lensDiffering(differingTenths: number): string {
  return `${tenths(differingTenths)}% of pixels differ`;
}

// Popup and options
export const PRODUCT_NAME = 'Factory Twins';
export const PRIVACY_TITLE = 'Nothing leaves your device.';
export const PRIVACY_CAPTION =
  "Factory Twins re-reads thumbnails from the store's own image server to compare them. It has no server of its own.";
export const NOBODY_ELSE = '0 to anyone else.';

export function imageReadsLine(byHost: Readonly<Record<string, number>>): string {
  const hosts = Object.entries(byHost).filter(([, n]) => n > 0);
  const total = hosts.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return 'No image reads this session.';
  const names = hosts.map(([h]) => h);
  const where = names.length === 1 ? `all from ${names[0]}` : `from ${names.join(', ')}`;
  return `${plural(total, 'image read', 'image reads')} this session, ${where}.`;
}

export const UNSUPPORTED_TITLE = 'Open a search page';
export const UNSUPPORTED_BODY = 'Factory Twins works on Amazon.com and Walmart.com search results.';
export const SEARCH_AMAZON = 'Search Amazon';
export const SEARCH_WALMART = 'Search Walmart';
export const SESSION_CLEARED = 'Session cleared';
export const UNDO = 'Undo';
export const CLEAR_SESSION = 'Clear this session';
export const SETTINGS_TITLE = 'Settings';
export const SAVED = 'Saved';
export const SAVE_FAILED = "Couldn't save. Try again.";
export const LOAD_FAILED = "Couldn't load settings. Close this and open it again.";

export function runOnStore(store: StoreId): string {
  return `Run on ${STORE_NAMES[store]}`;
}

export function onForStore(store: StoreId): string {
  return `On for ${STORE_NAMES[store]}`;
}

export function offOnStore(store: StoreId): string {
  return `Off on ${STORE_NAMES[store]}`;
}

export const SETTING_LABELS = {
  autoPill: 'Show the summary pill automatically',
  autoRings: 'Ring twins automatically',
  sessionMemory: 'Remember twins across pages',
  singleKeys: 'Single-key shortcuts',
  strictness: 'Matching',
  standard: 'Standard',
  strict: 'Strict',
} as const;

/** Example search links for the unsupported-page state (SPEC AC-F9.2). */
export const EXAMPLE_SEARCHES: Record<StoreId, string> = {
  'amazon-us': 'https://www.amazon.com/s?k=laptop+stand',
  'walmart-us': 'https://www.walmart.com/search?q=laptop+stand',
};
