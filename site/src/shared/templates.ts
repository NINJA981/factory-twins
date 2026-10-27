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
  FOLD_FOOTNOTE,
  FOLD_TWINS,
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
  formatPrice,
  pageChip,
  pillNoTwins,
  pillSegments,
  reviewsLabel,
  sameAsOthers,
  seenAcrossPages,
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

function barHeights(rungs: readonly Rung[]): Map<string, number> {
  const vals = rungs.map((r) => r.comparable).filter((v): v is number => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const out = new Map<string, number>();
  for (const r of rungs) {
    if (r.comparable == null) continue;
    out.set(r.id, max === min ? 56 : Math.round(24 + (72 * (r.comparable - min)) / (max - min)));
  }
  return out;
}

function rungHtml(r: Rung, view: FoldCardView, h: number | undefined): string {
  const tags: string[] = [];
  if (r.sponsored) tags.push(`<span class="chip">${esc(SPONSORED)}</span>`);
  if (r.otherPage != null) tags.push(`<span class="chip">${esc(pageChip(r.otherPage))}</span>`);
  if (r.mostEstablished) tags.push(`<span class="chip chip-established">${esc(MOST_ESTABLISHED)}</span>`);
  const label = r.isLowest ? LOWEST : r.isHighest ? HIGHEST : '';
  const price = r.price
    ? `<p class="rung-price">${r.price.isFromRange ? `<span class="rung-from">${esc(FROM)} </span>` : ''}${esc(formatPrice(r.price.amount))}</p>${view.perUnit ? `<p class="rung-unit">${esc(PER_UNIT)}</p>` : ''}`
    : `<p class="rung-price rung-noprice">${esc(NO_PRICE)}</p>`;
  const brand = r.brand
    ? `<p class="rung-brand">${esc(r.brand)}</p>`
    : `<p class="rung-brand rung-muted">Brand not shown</p>`;
  const rating =
    r.rating != null
      ? `<p class="rung-rating">${icon('star', 12)}<span>${esc(r.rating.toFixed(1))}</span></p>`
      : '';
  const reviews =
    r.reviewCount != null ? `<p class="rung-reviews">${esc(reviewsLabel(r.reviewCount))}</p>` : '';
  const few =
    r.fewReviewsReference != null
      ? `<p class="few-note">${icon('alert', 14)}<span>${esc(fewReviewsNote(r.fewReviewsReference))}</span></p>`
      : '';
  return `<li class="rung" data-id="${esc(r.id)}">
<div class="rung-thumb"><img src="${esc(r.imageUrl)}" alt="" width="40" height="40" decoding="async"></div>
<div class="rung-bar-wrap">${h != null ? `<div class="bar" style="--h:${h}px">${label ? `<span class="bar-label">${esc(label)}</span>` : ''}</div>` : ''}</div>
${price}${brand}${rating}${reviews}${tags.length ? `<div class="rung-tags">${tags.join('')}</div>` : ''}${few}
</li>`;
}

function bracketHtml(view: FoldCardView, heights: Map<string, number>): string {
  const tax = view.brandTax;
  if (!tax) return '';
  const n = view.rungs.length;
  const iLow = view.rungs.findIndex((r) => r.id === tax.lowId);
  const iHigh = view.rungs.findIndex((r) => r.id === tax.highId);
  const hLow = heights.get(tax.lowId);
  const hHigh = heights.get(tax.highId);
  if (iLow < 0 || iHigh < 0 || hLow == null || hHigh == null) return '';
  const y1 = 96 - hLow;
  const y2 = 96 - hHigh;
  const mid = (iLow + iHigh + 1) / 2 / n;
  return `<div class="bracket" aria-hidden="true"><svg viewBox="0 0 ${n} 96" preserveAspectRatio="none"><line x1="${iLow + 0.5}" y1="${y1}" x2="${iHigh + 0.5}" y2="${y2}" vector-effect="non-scaling-stroke"/></svg><span class="bracket-amount" style="left:${(mid * 100).toFixed(2)}%;top:${((y1 + y2) / 2).toFixed(1)}px">${esc(`+${formatPrice(tax.amount)}`)}</span></div>`;
}

/** The fold card (DESIGN.md, Fold card). `shortcuts` adds the keycaps. */
export function foldCardHtml(view: FoldCardView, o: { alt?: string; shortcuts?: boolean } = {}): string {
  const style = twinStyle(view.letter);
  const heights = barHeights(view.rungs);
  const tax = view.brandTax;
  const keycaps = o.shortcuts !== false;
  const cross =
    view.pagesSeen.length > 1
      ? `<p class="fold-seen">${esc(seenAcrossPages(view.memberCount, view.pagesSeen.length))}</p>`
      : '';
  return `<section class="fold-card twin twin-${style.slot}" data-letter="${esc(view.letter)}" aria-label="${esc(`Twin ${view.letter}. ${foldHeader(view.memberCount)}`)}">
<div class="fold-top">
<div class="fold-photo"><img src="${esc(view.photoUrl)}" alt="${esc(o.alt ?? `The shared photo of twin group ${view.letter}`)}" width="160" height="160" decoding="async"></div>
<div class="fold-head">
<h2 class="fold-title">${esc(foldHeader(view.memberCount))}</h2>
<div class="fold-tags"><span class="badge badge-static">${esc(badgeLabel(view.letter, view.memberCount))}</span>${tax ? `<span class="tax-tag">${icon('receipt', 16)}<span>${esc(brandTaxTag(tax.amount, tax.perUnit))}</span></span>` : ''}</div>
${cross}
</div></div>
<div class="ladder-scroll" role="group" tabindex="0" aria-label="${esc(`Twin ${view.letter} price ladder, scrolls sideways`)}"><div class="ladder-wrap" style="--n:${view.rungs.length}">${bracketHtml(view, heights)}<ol class="ladder" aria-label="Price ladder, cheapest first">${view.rungs.map((r) => rungHtml(r, view, heights.get(r.id))).join('')}</ol></div></div>
<div class="fold-foot">
<button type="button" class="btn btn-ghost" data-act="lens" data-letter="${esc(view.letter)}">${icon('loupe')}<span>Check the pixels</span>${keycaps ? '<kbd class="keycap">P</kbd>' : ''}</button>
<button type="button" class="btn btn-ghost" data-act="unfold">${esc(UNFOLD_TWINS.replace(' twins', ''))}${keycaps ? '<kbd class="keycap">F</kbd>' : ''}</button>
<p class="fold-note">${esc(FOLD_FOOTNOTE)}</p>
</div></section>`;
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
  const body = o.hasGroups
    ? pillSegments(summary)
        .map((s) => `<span class="seg">${emphasiseNumbers(s)}</span>`)
        .join('<span class="div" aria-hidden="true"></span><span class="sr-only">, </span>')
    : `<span class="seg">${emphasiseNumbers(pillNoTwins(summary.listings))}</span>`;
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
