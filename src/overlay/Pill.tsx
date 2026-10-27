import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { PillState } from '../core/state/pill';
import {
  FOLD_TWINS,
  HIDE_FOR_PAGE,
  PILL_ERROR,
  PILL_HINT,
  REPORT_LAYOUT,
  UNFOLD_TWINS,
  PRODUCT_NAME,
  pillAccessibleName,
  pillNoTwins,
  pillParts,
  pillScanning,
} from '../copy/strings';
import { IconAlert, IconArrow, IconClose, TwinGlyph } from './icons';

// The summary pill (SPEC F4). Variants are separate components so no boolean-prop soup builds up.
// The accessible name (SPEC AC-F4.1) is the visible words with commas between them, set as an
// aria-label: it contains every visible word in order (WCAG 2.5.3), the arrow and dividers are drawn.

export interface PillActions {
  onToggleRings(): void;
  onToggleFold(): void;
  onDismiss(): void;
}

function Shell({ children, live, progress }: { children: ReactNode; live?: boolean; progress?: number }) {
  return (
    <div
      className="ft-pill"
      role="group"
      aria-label={PRODUCT_NAME}
      aria-live={live ? 'polite' : undefined}
      data-testid="ft-pill"
    >
      {children}
      {progress != null && (
        <span
          className="ft-progress"
          aria-hidden="true"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
        />
      )}
    </div>
  );
}

const Divider = () => <span className="ft-divider" aria-hidden="true" />;

/** Bolds the first number or amount in a string ("up to $18 brand tax" gives "$18"). */
export function emphasize(text: string): ReactNode {
  const m = /(\$?\d[\d,.]*)/.exec(text);
  const found = m?.[1];
  if (!m || found == null) return text;
  return (
    <>
      {text.slice(0, m.index)}
      <b>{found}</b>
      {text.slice(m.index + found.length)}
    </>
  );
}

function DismissButton({ onDismiss }: { onDismiss(): void }) {
  return (
    <button
      type="button"
      className="ft-icon-button"
      onClick={onDismiss}
      aria-label={HIDE_FOR_PAGE}
      title={HIDE_FOR_PAGE}
    >
      <IconClose />
    </button>
  );
}

function ResultPill({
  state,
  ringsOn,
  folded,
  actions,
  instantSlot,
}: {
  state: Extract<PillState, { kind: 'result' }>;
  ringsOn: boolean;
  folded: boolean;
  actions: PillActions;
  instantSlot: boolean;
}) {
  const p = pillParts(state.summary);
  const [listings, products] = [p.listings, p.products];
  const onKeyDown = (e: KeyboardEvent) => {
    // Esc while the pill has focus hides it for this page (AC-F4.4).
    if (e.key === 'Escape') {
      e.stopPropagation();
      actions.onDismiss();
    }
  };
  return (
    <Shell live>
      <div style={{ display: 'contents' }} onKeyDown={onKeyDown}>
        <button
          type="button"
          className="ft-pill-body"
          onClick={actions.onToggleRings}
          aria-pressed={ringsOn}
          aria-label={pillAccessibleName(state.summary)}
          aria-describedby="ft-pill-hint"
        >
          <span className="ft-glyph">
            <TwinGlyph />
          </span>
          <span className="ft-pill-text">
            <span className="ft-segment">
              {emphasize(listings)}{' '}
              <span className="ft-arrow">
                <IconArrow />
              </span>{' '}
              {emphasize(products)}
            </span>
            <Divider /> <span className="ft-segment">{emphasize(p.groups)}</span>
            {p.tax && (
              <>
                <Divider /> <span className="ft-segment">{emphasize(p.tax)}</span>
              </>
            )}
          </span>
        </button>
        <span id="ft-pill-hint" className="ft-sr">
          {PILL_HINT}
        </span>
        {ringsOn && (
          <div className="ft-fold-slot" data-instant={instantSlot ? '' : undefined}>
            <div>
              <button type="button" className="ft-btn ft-secondary" onClick={actions.onToggleFold}>
                {folded ? UNFOLD_TWINS : FOLD_TWINS}
                <kbd className="ft-kbd">F</kbd>
              </button>
            </div>
          </div>
        )}
        <DismissButton onDismiss={actions.onDismiss} />
      </div>
    </Shell>
  );
}

function NoTwinsPill({
  state,
  actions,
}: {
  state: Extract<PillState, { kind: 'no-twins' }>;
  actions: PillActions;
}) {
  return (
    <Shell live>
      <div className="ft-pill-note">
        <span className="ft-glyph">
          <TwinGlyph />
        </span>
        <span>{pillNoTwins(state.summary.listings)}</span>
      </div>
      <DismissButton onDismiss={actions.onDismiss} />
    </Shell>
  );
}

function ScanningPill({ state }: { state: Extract<PillState, { kind: 'scanning' }> }) {
  const pct = state.total > 0 ? state.done / state.total : 0;
  return (
    <Shell progress={pct}>
      <div className="ft-pill-note" role="status">
        <span className="ft-glyph">
          <TwinGlyph />
        </span>
        <span>{pillScanning(state.done, state.total)}</span>
      </div>
    </Shell>
  );
}

function ErrorPill({ reportUrl, actions }: { reportUrl: string; actions: PillActions }) {
  return (
    <Shell live>
      <div className="ft-pill-note" data-tone="danger" role="alert">
        <IconAlert />
        <span>{PILL_ERROR}</span>
      </div>
      <a className="ft-link" href={reportUrl} target="_blank" rel="noreferrer noopener">
        {REPORT_LAYOUT}
      </a>
      <DismissButton onDismiss={actions.onDismiss} />
    </Shell>
  );
}

export function Pill(props: {
  state: PillState;
  ringsOn: boolean;
  folded: boolean;
  reportUrl: string;
  actions: PillActions;
  /** Skip the fold button's grow animation (keyboard-triggered rings). */
  instantSlot?: boolean;
}) {
  const { state, actions } = props;
  switch (state.kind) {
    case 'result':
      return (
        <ResultPill
          state={state}
          ringsOn={props.ringsOn}
          folded={props.folded}
          actions={actions}
          instantSlot={props.instantSlot ?? true}
        />
      );
    case 'no-twins':
      return <NoTwinsPill state={state} actions={actions} />;
    case 'scanning':
      return <ScanningPill state={state} />;
    case 'error':
      return <ErrorPill reportUrl={props.reportUrl} actions={actions} />;
    default:
      return null;
  }
}

export const SCAN_SHOW_AFTER_MS = 300;
export const SCAN_MIN_VISIBLE_MS = 400;

/**
 * What the pill should show right now (DESIGN.md, Pill states): the scanning state appears only if
 * scanning takes longer than 300 ms, and stays at least 400 ms once shown, so it never flashes.
 */
export function usePillDisplay(state: PillState): PillState {
  const [shown, setShown] = useState<PillState>(state.kind === 'scanning' ? { kind: 'idle' } : state);
  const latest = useRef(state);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    latest.current = state;
    if (state.kind === 'scanning') {
      if (shownAt.current != null) {
        setShown(state);
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          timer.current = null;
          shownAt.current = performance.now();
          setShown(latest.current);
        }, SCAN_SHOW_AFTER_MS);
      }
      return;
    }
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (shownAt.current != null) {
      const wait = Math.max(0, SCAN_MIN_VISIBLE_MS - (performance.now() - shownAt.current));
      shownAt.current = null;
      if (wait > 0) {
        const t = setTimeout(() => setShown(latest.current), wait);
        return () => clearTimeout(t);
      }
    }
    setShown(state);
  }, [state]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return shown;
}
