// Markup for the faithful HTML/CSS reproduction of the real overlay (DESIGN.md: pill, rings, badges,
// fold card). Pure string builders over the engine's own view models, used both at build time (static
// landing HTML, via tsx) and in the browser (the /app page). Every dynamic string goes through esc().
import {
  badgeViews,
  foldCardView,
  twinStyle,
  type ClusterResult,
  type FoldCardView,
  type Listing,
  type Rung,
  type ScanSummary,
  type TwinGroup,
} from '@engine';
import {
  CHECK_PIXELS,
  FOLD_FOOTNOTE,
  FOLD_TWINS,
  GROUP_PHOTO_ALT,
  HIDE_FOR_PAGE,
  HIGHEST,
  LOWEST,
  MOST_ESTABLISHED,
  NO_PRICE,
  PER_UNIT,
  FROM,
  SPONSORED,
  badgeLabel,
  brandTaxTag,
  fewReviewsNote,
  foldHeader,
  formatCount,
  formatPrice,
  pageChip,
  pillNoTwins,
  pillSegments,
  reviewsLabel,
  sameAsOthers,
  seenAcrossPages,
  UNFOLD_LABEL,
  UNFOLD_TWINS,
} from '@copy';
import { esc } from './dom';
import { glyph, icon } from './icons';

export interface TileOpts {
  /** Group letter when the listing belongs to a twin group. */
  letter?: string;
  members?: number;
  /** Alt text of the photo. */
  alt?: string;
  /** Extra attribute string for the <img> (loading, fetchpriority, ...). */
  imgAttrs?: string;
  /** Square size the photo is reserved at, in CSS px. */
  size?: number;
  /** Extra controls rendered inside the tile (the web app's price and remove controls). */
  extra?: string;
  /** Hide title and rating (photo-only tiles in the web app). */
  compact?: boolean;
}

function stars(rating: number | null): string {
  if (rating == null) return '';
  return `<span class="rating" aria-label="${esc(rating.toFixed(1))} out of 5 stars">${icon('star', 12)}<span>${esc(rating.toFixed(1))}</span></span>`;
}

export function priceText(l: Pick<Listing, 'price'>): string {
  if (!l.price) return NO_PRICE;
  return `${l.price.isFromRange ? `${FROM} ` : ''}${formatPrice(l.price.amount)}`;
}

/** A store-like product tile. Rings and badges are inert until the stage sets data-rings. */
export function tileHtml(l: Listing, o: TileOpts = {}): string {
  const twin = o.letter ? twinStyle(o.letter) : null;
  const size = o.size ?? 360;
  const cls = twin ? ` twin twin-${twin.slot}` : '';
  const attrs = twin
    ? ` data-twin data-letter="${esc(o.letter as string)}" data-pattern="${twin.pattern}"`
    : '';
  const badge =
    o.letter && o.members
      ? `<button type="button" class="badge" data-act="lens" data-letter="${esc(o.letter)}" aria-label="${esc(`${badgeLabel(o.letter, o.members)}. ${sameAsOthers(o.members - 1)}. Check the pixels.`)}" title="${esc(sameAsOthers(o.members - 1))}">${esc(badgeLabel(o.letter, o.members))}</button>`
      : '';
  const meta = o.compact
    ? ''
    : `<p class="tile-title">${esc(l.title)}</p><p class="tile-meta">${stars(l.rating)}${l.reviewCount != null ? `<span class="count">${esc(l.reviewCount.toLocaleString('en-US'))}</span>` : ''}</p>`;
  return `<article class="tile${cls}" data-id="${esc(l.id)}"${attrs}>
<div class="tile-media"><img src="${esc(l.imageUrl)}" alt="${esc(o.alt ?? l.title)}" width="${size}" height="${size}" decoding="async"${o.imgAttrs ? ` ${o.imgAttrs}` : ''}></div>
<div class="tile-body">${meta}<p class="tile-price">${esc(priceText(l))}</p>${o.extra ?? ''}</div>${badge}</article>`;
}

// Bar geometry shared with stage.css and the extension's FoldCard: bars run 24 to 96 px, a rung with no
// comparable price gets a dashed 24 px stub, and the tallest bar's top sits 52 px below the rung's top
// (padding 8 + thumbnail 40 + gap 4), which is where the bracket column starts.
const BAR_MIN = 24;
const BAR_MAX = 96;
const BAR_NONE = 24;
const BRACKET_TOP = 52;

function barHeights(rungs: readonly Rung[]): (number | null)[] {
  const vals = rungs.map((r) => r.comparable).filter((v): v is number => v != null);
  if (vals.length === 0) return rungs.map(() => null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return rungs.map((r) => {
    if (r.comparable == null) return null;
    if (max === min) return Math.round((BAR_MIN + BAR_MAX) / 2);
    return Math.round(BAR_MIN + ((r.comparable - min) / (max - min)) * (BAR_MAX - BAR_MIN));
  });
}

/** Same rule as the extension: per-unit cards show the comparable price, others the listed one. */
function rungPrice(r: Rung, perUnit: boolean): string {
  if (perUnit && r.comparable != null)
    return `<p class="rung-price"><span>${esc(formatPrice(r.comparable))}</span><small>${esc(PER_UNIT)}</small></p>`;
  if (!r.price) return `<p class="rung-price rung-noprice">${esc(NO_PRICE)}</p>`;
  return `<p class="rung-price">${r.price.isFromRange ? `<small>${esc(FROM)}</small>` : ''}<span>${esc(formatPrice(r.price.amount))}</span></p>`;
}

function rungHtml(r: Rung, view: FoldCardView, h: number | null): string {
  const tags: string[] = [];
  if (r.mostEstablished) tags.push(`<span class="chip chip-established">${esc(MOST_ESTABLISHED)}</span>`);
  if (r.sponsored) tags.push(`<span class="chip">${esc(SPONSORED)}</span>`);
  if (r.otherPage != null) tags.push(`<span class="chip">${esc(pageChip(r.otherPage))}</span>`);
  const label = r.isLowest ? LOWEST : r.isHighest ? HIGHEST : '';
  // Empty lines keep a space, so every rung's rows line up across the ladder.
  const brand = `<p class="rung-sub rung-brand">${r.brand ? esc(r.brand) : '&nbsp;'}</p>`;
  const rating =
    r.rating != null
      ? `<p class="rung-sub rung-rating">${icon('star', 12)}<span>${esc(r.rating.toFixed(1))}</span><span class="sr-only"> out of 5 stars</span></p>`
      : '<p class="rung-sub">&nbsp;</p>';
  const reviews = `<p class="rung-sub rung-reviews">${r.reviewCount != null ? esc(reviewsLabel(r.reviewCount)) : '&nbsp;'}</p>`;
  const few =
    r.fewReviewsReference != null
      ? `<p class="few-note">${icon('alert', 14)}<span>${esc(fewReviewsNote(r.fewReviewsReference))}</span></p>`
      : '';
  const bar = `<div class="bar"${h == null ? ' data-none' : ''} style="height:${h ?? BAR_NONE}px">${label ? esc(label) : ''}</div>`;
  return `<li class="rung" data-id="${esc(r.id)}">
<div class="rung-bars"><div class="rung-thumb"><img src="${esc(r.imageUrl)}" alt="" width="40" height="40" decoding="async"></div>${bar}</div>
${rungPrice(r, view.perUnit)}${brand}${rating}${reviews}<div class="rung-tags">${tags.join('')}</div>${few}
</li>`;
}

/**
 * The brand-tax bracket: a dimension line in its own column at the card's right edge, between dashed
 * extension lines carried across from the tops of the Highest and Lowest bars (as in the extension).
 */
function bracketHtml(view: FoldCardView, heights: (number | null)[]): string {
  const tax = view.brandTax;
  if (!tax) return '';
  const low = view.rungs.findIndex((r) => r.isLowest);
  const high = view.rungs.findIndex((r) => r.isHighest);
  if (low < 0 || high < 0 || low === high) return '';
  const yLow = BAR_MAX - (heights[low] ?? BAR_NONE);
  const yHigh = BAR_MAX - (heights[high] ?? BAR_MAX);
  return `<div class="bracket" aria-hidden="true"><span class="bracket-ext" style="top:${yHigh}px"></span><span class="bracket-ext" style="top:${yLow}px"></span><span class="bracket-dim"><span class="bracket-tick" style="top:${yHigh}px"></span><span class="bracket-tick" style="top:${yLow}px"></span><span class="bracket-line" style="top:${yHigh}px;height:${Math.max(0, yLow - yHigh)}px"></span><span class="bracket-amount" style="top:${(yHigh + yLow) / 2}px">${esc(`+${formatPrice(tax.amount)}`)}</span></span></div>`;
}

function rangeHtml(view: FoldCardView): string {
  const priced = view.rungs.map((r) => r.comparable).filter((v): v is number => v != null);
  if (priced.length < 2) return `${esc(formatCount(view.rungs.length))} listings`;
  return `<b>${esc(formatPrice(Math.min(...priced)))}</b> to <b>${esc(formatPrice(Math.max(...priced)))}</b>${view.perUnit ? ` ${esc(PER_UNIT)}` : ''}`;
}

/**
 * The fold card (DESIGN.md, Fold card), laid out like the extension's FoldCard: a rail with the shared
 * photo and its two actions, then the tinted header band, the price range with the brand-tax tag, and
 * the ladder with the bracket column. `shortcuts` adds the keycaps.
 */
export function foldCardHtml(view: FoldCardView, o: { alt?: string; shortcuts?: boolean } = {}): string {
  const style = twinStyle(view.letter);
  const heights = barHeights(view.rungs);
  const tax = view.brandTax;
  const keycaps = o.shortcuts !== false;
  const bracket = bracketHtml(view, heights);
  const low = view.rungs.findIndex((r) => r.isLowest);
  const guide = bracket
    ? `<div class="guide" aria-hidden="true" style="top:${BRACKET_TOP + BAR_MAX - (heights[low] ?? BAR_NONE)}px"></div>`
    : '';
  const cross =
    view.pagesSeen.length > 1
      ? `<p class="fold-seen">${esc(seenAcrossPages(view.memberCount, view.pagesSeen.length))}</p>`
      : '';
  // Rung count (capped at 6) picks the widths at which stage.css stacks the rail and drops the bracket.
  const n = Math.min(view.rungs.length, 6);
  return `<section class="fold-card twin twin-${style.slot}" data-letter="${esc(view.letter)}" data-n="${n}" aria-label="${esc(`Twin ${view.letter}. ${foldHeader(view.memberCount)}`)}">
<div class="fold-grid">
<div class="fold-rail">
<div class="fold-photo"><img src="${esc(view.photoUrl)}" alt="${esc(o.alt ?? GROUP_PHOTO_ALT)}" width="160" height="160" decoding="async"></div>
<button type="button" class="btn btn-ghost fold-btn" data-act="lens" data-letter="${esc(view.letter)}"><span>${esc(CHECK_PIXELS)}</span>${keycaps ? '<kbd class="keycap">P</kbd>' : ''}</button>
<button type="button" class="btn btn-ghost fold-btn" data-act="unfold"><span>${esc(UNFOLD_LABEL)}</span>${keycaps ? '<kbd class="keycap">F</kbd>' : ''}</button>
${cross}</div>
<div class="fold-main">
<div class="fold-head"><h2 class="fold-title">${esc(foldHeader(view.memberCount))}</h2><span class="badge badge-static">${esc(badgeLabel(view.letter, view.memberCount))}</span></div>
<div class="fold-summary"><span class="fold-range">${rangeHtml(view)}</span>${tax ? `<span class="tax-tag">${icon('receipt', 16)}<span>${esc(brandTaxTag(tax.amount, tax.perUnit))}</span></span>` : ''}</div>
<div class="fold-ladder"${bracket ? ' data-measure' : ''}>
<div class="ladder-scroll" role="group" tabindex="0" aria-label="${esc(`Twin ${view.letter} price ladder, scrolls sideways`)}"><div class="ladder-wrap">${guide}<ol class="ladder" aria-label="Price ladder, cheapest first">${view.rungs.map((r, i) => rungHtml(r, view, heights[i] ?? null)).join('')}</ol></div></div>
${bracket}</div>
</div></div>
<div class="fold-foot"><p class="fold-note">${esc(FOLD_FOOTNOTE)}</p></div>
</section>`;
}

function emphasiseNumbers(segment: string): string {
  return esc(segment)
    .replace(/(\$?\d[\d,]*)/g, '<b>$1</b>')
    .replace('→', '<span class="arrow" aria-hidden="true">→</span>');
}

/** The summary pill. The three segments are separated by drawn dividers, never typed dots. */
export function pillHtml(
  summary: ScanSummary,
  o: { hasGroups: boolean; folded?: boolean; keycaps?: boolean; dismissable?: boolean } = { hasGroups: true },
): string {
  const caps = o.keycaps !== false;
  // Every segment carries its divider at its leading edge; the row is shifted left by one divider slot and
  // clipped (stage.css), so whichever segment starts a line hides its divider, at any width (as in the
  // extension's pill).
  const seg = (text: string) =>
    `<span class="seg"><span class="div" aria-hidden="true"></span>${emphasiseNumbers(text)}</span>`;
  const segs = o.hasGroups
    ? pillSegments(summary).map(seg).join('<span class="sr-only">, </span>')
    : seg(pillNoTwins(summary.listings));
  const body = `<span class="pill-text"><span class="pill-row">${segs}</span></span>`;
  // The button's name is its visible text (arrow and dividers are decorative and aria-hidden, the commas
  // are screen-reader only), so the spoken name always contains what is on screen (WCAG 2.5.3).
  const main = o.hasGroups
    ? `<button type="button" class="pill-main" data-act="rings" aria-pressed="false">${glyph(16)}${body}</button>`
    : `<div class="pill-main pill-static" role="status">${glyph(16)}${body}</div>`;
  const fold = o.hasGroups
    ? `<span class="pill-extra"><span class="pill-extra-in"><button type="button" class="pill-fold" data-act="fold"><span class="fold-label">${esc(o.folded ? UNFOLD_TWINS : FOLD_TWINS)}</span>${caps ? '<kbd class="keycap">F</kbd>' : ''}</button></span></span>`
    : '';
  const dismiss =
    o.dismissable === false
      ? ''
      : `<button type="button" class="pill-x" data-act="dismiss" aria-label="${esc(HIDE_FOR_PAGE)}">${icon('x')}</button>`;
  return `<div class="pill" data-pill>${main}${fold}${dismiss}</div>`;
}

export interface StageData {
  listings: readonly Listing[];
  result: ClusterResult;
  currentPage?: number;
}

/** Grid of tiles with every fold card pre-inserted before its leader tile (hidden until folded). */
export function gridHtml(
  data: StageData,
  o: { imgAttrs?: (l: Listing, i: number) => string; compact?: boolean; extra?: (l: Listing) => string } = {},
): string {
  const listings = [...data.listings].sort((a, b) => a.page - b.page || a.position - b.position);
  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));
  const page = data.currentPage ?? 1;
  const badges = badgeViews(data.result.groups, byId, page);
  const cards = new Map<string, string>();
  for (const g of data.result.groups) {
    const view = foldCardView(g, byId, page);
    if (!view) continue;
    const leader = firstInGrid(g, listings);
    if (leader) cards.set(leader, foldCardHtml(view));
  }
  return listings
    .map((l, i) => {
      const b = badges.get(l.id);
      const tile = tileHtml(l, {
        letter: b?.letter,
        members: b?.members,
        imgAttrs: o.imgAttrs?.(l, i),
        compact: o.compact,
        extra: o.extra?.(l),
      });
      return `${cards.get(l.id) ?? ''}${tile}`;
    })
    .join('\n');
}

function firstInGrid(g: TwinGroup, ordered: readonly Listing[]): string | null {
  const ids = new Set(g.memberIds);
  return ordered.find((l) => ids.has(l.id))?.id ?? null;
}
