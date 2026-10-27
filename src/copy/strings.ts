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

/**
 * Pieces of the result pill, so the UI can draw the arrow and dividers itself. The spoken name is
 * the visible text with commas between the pieces (WCAG 2.5.3: the name contains the visible label).
 */
export function pillParts(s: ScanSummary): {
  listings: string;
  products: string;
  groups: string;
  tax: string | null;
} {
  return {
    listings:
      s.pages.length > 1
        ? `${plural(s.listings, 'listing', 'listings')} across ${s.pages.length} pages`
        : plural(s.listings, 'listing', 'listings'),
    products: plural(s.products, 'product', 'products'),
    groups: plural(s.twinGroups, 'twin group', 'twin groups'),
    tax:
      s.maxBrandTaxDollars != null && s.maxBrandTaxDollars > 0
        ? `up to ${formatWholeDollars(s.maxBrandTaxDollars)} brand tax`
        : null,
  };
}

/** Accessible name of the pill (SPEC AC-F4.1): the visible words, spoken with commas, no arrow. */
export function pillAccessibleName(s: ScanSummary): string {
  const p = pillParts(s);
  return [p.listings, p.products, p.groups, p.tax].filter((x): x is string => x != null).join(', ');
}

/** Read after the name, as a description (not part of the name). */
export const PILL_HINT = 'Shows rings on the twins. Shortcut T.';

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

export const POPUP_ERROR = "Couldn't read this page's listings.";
export const POPUP_PILL_OFF = 'The summary pill is turned off in Settings, so there is nothing to show here.';
export const POPUP_WAIT_SCANNING = 'Available once the photos are checked.';
export function popupScanning(done: number, total: number): string {
  return `Checking photos… ${formatCount(done)}/${formatCount(total)}`;
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

// Overlay on the store page
export const GROUP_PHOTO_ALT = 'The photo these listings share';
export const CHECK_PIXELS = 'Check the pixels';
export const UNFOLD_LABEL = 'Unfold';
export const CLOSE = 'Close';
export const SHORTCUTS_TITLE = 'Shortcuts';
export const SHORTCUT_ROWS: ReadonlyArray<{ keys: string[]; label: string }> = [
  { keys: ['T'], label: 'Show or hide twin rings' },
  { keys: ['F'], label: 'Fold or unfold twins' },
  { keys: ['P'], label: 'Check the pixels of a group' },
  { keys: ['O', 'D'], label: 'Onion skin or Difference in the lens' },
  { keys: ['←', '→'], label: 'Move the blend slider (Shift for bigger steps)' },
  { keys: ['Esc'], label: 'Close the lens, then this list' },
  { keys: ['?'], label: 'Show or hide this list' },
];

export function foldDetail(letter: string, members: number, low: number | null, high: number | null): string {
  const head = `Twin ${letter}: ${members} listings use the same photo`;
  return low != null && high != null && high > low
    ? `${head}, ${formatPrice(low)} to ${formatPrice(high)}.`
    : `${head}.`;
}

export const UNFOLDED = "Unfolded. The listings are back in the store's grid.";
export const LENS_MODE_LABEL = 'View';
export const LENS_BLEND = 'Blend';
export const LENS_BLEND_HINT = 'Left and right arrows move 5%. Shift moves 25%.';
export const LENS_IDENTICAL_WORD = 'identical';
export const NO_PRICE_SHORT = 'No price';
export const NO_BRAND = 'No brand shown';

// Popup and options additions
export const STAT_LISTINGS = 'Listings';
export const STAT_PRODUCTS = 'Products';
export const STAT_GROUPS = 'Twin groups';
export const STAT_TAX = 'Largest brand tax';
export const STATUS_NOT_SEARCH = 'Not a search page';
export const ACTION_SHOW_TWINS = 'Show twins on this page';
export const ACTION_FOLD = 'Fold twins';
export const SETTINGS_LINK = 'Settings';
export const SHORTCUTS_LINK = 'Shortcuts';
export const CHECKING_PHOTOS = 'Checking photos…';
export const COMMAND_FAILED = "Couldn't reach this page. Reload it and try again.";
export const MATCHING_HELP = {
  standard: 'Groups listings whose photos match closely. Catches re-uploads and small crops.',
  strict: 'Groups only near-identical files. Fewer groups, fewer surprises.',
} as const;
export const BEHAVIOUR_HELP = {
  autoPill: 'A small pill with the counts appears after each search.',
  autoRings: 'Draw the rings as soon as a page is read.',
  sessionMemory: 'Page 2 and 3 of a search join the groups found on page 1. Cleared when the browser closes.',
  singleKeys: 'T, F and P work on search pages when no text field has focus.',
} as const;
export const STORES_HELP = 'Factory Twins only runs on these search pages.';
export const CHANGE_SHORTCUTS = 'Change browser shortcuts';
export const SHORTCUTS_HELP = 'Alt+Shift+T and Alt+Shift+F also work from the browser. You can rebind them.';
export const ABOUT_LICENCE = 'MIT licence';
export const ABOUT_SOURCE = 'Source code';
export const ABOUT_LINE = 'Factory Twins compares photos, not products. It runs on your device.';
export const RELOAD = 'Reload';
export const LOAD_FAILED_DEFAULTS = "Couldn't load settings. Defaults are shown.";
export const SESSION_CLEARED_NOTE = 'Session cleared';
export const SECTION = {
  stores: 'Stores',
  behaviour: 'Behaviour',
  matching: 'Matching',
  shortcuts: 'Shortcuts',
  privacy: 'Privacy',
  about: 'About',
} as const;
