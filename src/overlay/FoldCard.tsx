import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import {
  CHECK_PIXELS,
  FROM,
  GROUP_PHOTO_ALT,
  HIGHEST,
  LISTING_LEFT,
  LOWEST,
  MOST_ESTABLISHED,
  NO_PRICE,
  PER_UNIT,
  SPONSORED,
  UNFOLD_LABEL,
  badgeLabel,
  brandTaxTag,
  fewReviewsNote,
  foldHeader,
  formatCount,
  formatPrice,
  FOLD_FOOTNOTE,
  pageChip,
  reviewsLabel,
  seenAcrossPages,
} from '../copy/strings';
import type { FoldCardView, Rung } from '../core/view/groupView';
import { twinStyle } from '../core/view/twinStyle';
import { IconAlert, IconReceipt, IconStar } from './icons';

// The fold card (SPEC F6, DESIGN.md "Fold card"). Presentational: the fold choreography finds its
// parts through the `data-a` attributes, so they are part of this component's contract.

const BAR_MIN = 24;
const BAR_MAX = 96;
const BAR_NONE = 24;
/** Layout constants shared with card.css: rung padding 8 + thumbnail 40 + gap 4 = top of the tallest bar. */
const BRACKET_TOP = 52;

export function barHeights(rungs: readonly Pick<Rung, 'comparable'>[]): (number | null)[] {
  const values = rungs.map((r) => r.comparable).filter((v): v is number => v != null);
  if (values.length === 0) return rungs.map(() => null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return rungs.map((r) => {
    if (r.comparable == null) return null;
    if (max === min) return Math.round((BAR_MIN + BAR_MAX) / 2);
    return Math.round(BAR_MIN + ((r.comparable - min) / (max - min)) * (BAR_MAX - BAR_MIN));
  });
}

/**
 * Marks which edges of a sideways-scrolling ladder hide rungs (`data-fade="start end"`), so card.css
 * can fade those edges. Written straight to the element: scrolling must not re-render the card.
 */
export function useEdgeFades(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const edges = [el.scrollLeft > 1 ? 'start' : '', el.scrollLeft < max - 1 ? 'end' : '']
        .filter(Boolean)
        .join(' ');
      if (edges) el.setAttribute('data-fade', edges);
      else el.removeAttribute('data-fade');
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [ref]);
}

function priceText(
  rung: Rung,
  perUnit: boolean,
): { text: string; prefix: string | null; unit: boolean } | null {
  if (perUnit && rung.comparable != null)
    return { text: formatPrice(rung.comparable), prefix: null, unit: true };
  if (!rung.price) return null;
  return { text: formatPrice(rung.price.amount), prefix: rung.price.isFromRange ? FROM : null, unit: false };
}

function RungView({
  rung,
  index,
  perUnit,
  height,
  gone,
}: {
  rung: Rung;
  index: number;
  perUnit: boolean;
  height: number | null;
  gone: boolean;
}) {
  const price = priceText(rung, perUnit);
  const bar = height ?? BAR_NONE;
  return (
    <a
      className="rung"
      href={rung.url}
      data-a="rung"
      data-id={rung.id}
      style={{ gridColumn: index + 1 }}
      rel="noopener"
    >
      <div className="bars">
        <img className="thumb" data-a="thumb" data-id={rung.id} src={rung.imageUrl} alt="" />
        <div className="bar" data-a="bar" data-none={height == null ? '' : undefined} style={{ height: bar }}>
          {rung.isLowest ? LOWEST : rung.isHighest ? HIGHEST : null}
        </div>
      </div>
      <div className="price" data-a="fade" data-none={price ? undefined : ''}>
        {price ? (
          <>
            {price.prefix && <small>{price.prefix}</small>}
            <span>{price.text}</span>
            {price.unit && <small>{PER_UNIT}</small>}
          </>
        ) : (
          NO_PRICE
        )}
      </div>
      <span className="sub brand" data-a="fade">
        {rung.brand ?? ' '}
      </span>
      <span className="sub rating" data-a="fade">
        {rung.rating != null ? (
          <>
            <IconStar />
            <span>{rung.rating.toFixed(1)}</span>
            <span className="ft-sr"> out of 5 stars</span>
          </>
        ) : (
          ' '
        )}
      </span>
      <span className="sub" data-a="fade">
        {rung.reviewCount != null ? reviewsLabel(rung.reviewCount) : ' '}
      </span>
      <div className="tags" data-a="fade">
        {rung.mostEstablished && (
          <span className="tag" data-strong="">
            {MOST_ESTABLISHED}
          </span>
        )}
        {rung.sponsored && <span className="tag">{SPONSORED}</span>}
        {rung.otherPage != null && <span className="tag">{pageChip(rung.otherPage)}</span>}
      </div>
      {gone && <span className="gone">{LISTING_LEFT}</span>}
    </a>
  );
}

export interface FoldCardProps {
  view: FoldCardView;
  /** Listing ids whose tiles are no longer on the page (lazy reload dropped them). */
  goneIds: ReadonlySet<string>;
  onCheckPixels(): void;
  onUnfold(): void;
  onFocusGroup(): void;
}

export function FoldCard({ view, goneIds, onCheckPixels, onUnfold, onFocusGroup }: FoldCardProps) {
  const style = twinStyle(view.letter);
  const vars = {
    '--g': `var(--twin-${style.color})`,
    '--g-soft': `var(--twin-${style.color}-soft)`,
    '--g-ink': `var(--twin-${style.color}-ink)`,
  } as CSSProperties;
  const heights = barHeights(view.rungs);
  const low = view.rungs.findIndex((r) => r.isLowest);
  const high = view.rungs.findIndex((r) => r.isHighest);
  const n = view.rungs.length;
  const showBracket = view.brandTax != null && low >= 0 && high >= 0 && low !== high;
  const yLow = BAR_MAX - (heights[low] ?? BAR_NONE);
  const yHigh = BAR_MAX - (heights[high] ?? BAR_MAX);
  const priced = view.rungs.filter((r) => r.comparable != null);
  const notes = view.rungs.map((r, i) => ({ r, i })).filter(({ r }) => r.fewReviewsReference != null);
  const pages = view.pagesSeen.length;
  const scroller = useRef<HTMLDivElement>(null);
  useEdgeFades(scroller);

  return (
    <section
      className="card ft-ui"
      style={vars}
      aria-label={`Twin ${view.letter}. ${foldHeader(view.memberCount)}`}
      onPointerEnter={onFocusGroup}
      onFocusCapture={onFocusGroup}
    >
      <div className="card-bg" data-a="surface">
        <div className="card-band" />
      </div>
      <div className="card-in">
        <div className="card-grid">
          <div className="rail" data-a="fade">
            <img className="photo" src={view.photoUrl} alt={GROUP_PHOTO_ALT} />
            <button type="button" className="ft-btn" onClick={onCheckPixels}>
              {CHECK_PIXELS}
              <kbd className="ft-kbd">P</kbd>
            </button>
            <button type="button" className="ft-btn" onClick={onUnfold}>
              {UNFOLD_LABEL}
              <kbd className="ft-kbd">F</kbd>
            </button>
            {pages > 1 && <p className="seen">{seenAcrossPages(view.memberCount, pages)}</p>}
          </div>
          <div className="main">
            <div className="head" data-a="fade">
              <h2 tabIndex={-1}>{foldHeader(view.memberCount)}</h2>
              <span className="badge-static">{badgeLabel(view.letter, view.memberCount)}</span>
            </div>
            <div className="summary" data-a="fade">
              <span className="range">
                {priced.length >= 2 ? (
                  <>
                    <b>{formatPrice(Math.min(...priced.map((r) => r.comparable as number)))}</b>
                    {' to '}
                    <b>{formatPrice(Math.max(...priced.map((r) => r.comparable as number)))}</b>
                    {view.perUnit && ` ${PER_UNIT}`}
                  </>
                ) : (
                  `${formatCount(n)} listings`
                )}
              </span>
              {view.brandTax && (
                <span className="tax" data-a="tag">
                  <IconReceipt />
                  {brandTaxTag(view.brandTax.amount, view.brandTax.perUnit)}
                </span>
              )}
            </div>
            <div className="ladder" data-measure={showBracket ? '' : undefined}>
              <div className="scroller" ref={scroller}>
                <div className="rungs" style={{ ['--n' as string]: n }}>
                  {showBracket && (
                    <div className="guide" aria-hidden="true" style={{ top: BRACKET_TOP + yLow }} />
                  )}
                  {view.rungs.map((r, i) => (
                    <RungView
                      key={r.id}
                      rung={r}
                      index={i}
                      perUnit={view.perUnit}
                      height={heights[i] ?? null}
                      gone={r.otherPage == null && goneIds.has(r.id)}
                    />
                  ))}
                  {notes.map(({ r, i }) => (
                    <p
                      key={`note-${r.id}`}
                      className="note"
                      data-a="fade"
                      style={{ gridColumn: i < n - 1 ? `${i + 1} / span 2` : `${Math.max(1, i)} / span 2` }}
                    >
                      <IconAlert size={14} />
                      <span>{fewReviewsNote(r.fewReviewsReference as number)}</span>
                    </p>
                  ))}
                </div>
              </div>
              {showBracket && view.brandTax && (
                <div className="bracket" aria-hidden="true">
                  {/* Extension lines carry the tops of the Highest and Lowest bars across to the
                      dimension line, so every card's brand tax sits in the same column at the right. */}
                  <span className="bracket-ext" data-a="ext" style={{ top: yHigh }} />
                  <span className="bracket-ext" data-a="ext" style={{ top: yLow }} />
                  <span className="bracket-dim" data-a="bracket">
                    <span className="bracket-tick" style={{ top: yHigh }} />
                    <span className="bracket-tick" style={{ top: yLow }} />
                    <span
                      className="bracket-line"
                      style={{ top: yHigh, height: Math.max(0, yLow - yHigh) }}
                    />
                    <span className="bracket-amount" style={{ top: (yHigh + yLow) / 2 }}>
                      +{formatPrice(view.brandTax.amount)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="foot" data-a="fade">
          <p>{FOLD_FOOTNOTE}</p>
        </div>
      </div>
    </section>
  );
}
