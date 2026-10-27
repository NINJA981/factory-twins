import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CLOSE,
  LENS_BLEND,
  LENS_BLEND_HINT,
  LENS_BOTTOM,
  LENS_DIFFERENCE,
  LENS_DIFFERENT,
  LENS_ERROR,
  LENS_IDENTICAL_ALL,
  LENS_IDENTICAL_WORD,
  LENS_METHOD,
  LENS_MODE_LABEL,
  LENS_ONION,
  LENS_SWAP,
  LENS_TITLE,
  LENS_TOP,
  NO_BRAND,
  NO_PRICE_SHORT,
  TRY_AGAIN,
  formatPrice,
  lensDiffering,
  lensReadout,
} from '../copy/strings';
import type { LensState, OverlayAction } from '../core/state/overlay';
import type { FoldCardView } from '../core/view/groupView';
import type { PixelDiffReply } from '../messaging/protocol';
import type { PixelDiffResult } from '../core/hash/pixelDiff';
import { IconAlert, IconClose } from './icons';
import { EASE, canAnimate } from './motion';

// The Proof lens (SPEC F7): two photos stacked in a square, an onion-skin slider, a Difference mode
// where identical photos go black, and a readout that is computed, never estimated.

type Measure = (topId: string, bottomId: string) => Promise<PixelDiffReply>;

type Measurement =
  { state: 'loading' } | { state: 'ok'; result: PixelDiffResult; fresh: boolean } | { state: 'error' };

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** Measures the pair once; swapping the photos reuses the number and never rolls it again. */
function useMeasurement(top: string, bottom: string, measure: Measure) {
  const cache = useRef(new Map<string, PixelDiffResult>());
  const [m, setM] = useState<Measurement>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const key = pairKey(top, bottom);
    const hit = cache.current.get(key);
    if (hit) {
      setM({ state: 'ok', result: hit, fresh: false });
      return;
    }
    let live = true;
    setM({ state: 'loading' });
    void measure(top, bottom).then(
      (r) => {
        if (!live) return;
        if (r.ok) {
          cache.current.set(key, r.result);
          setM({ state: 'ok', result: r.result, fresh: true });
        } else setM({ state: 'error' });
      },
      () => live && setM({ state: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [top, bottom, measure, attempt]);
  return { m, retry: () => setAttempt((n) => n + 1) };
}

/** Digits slide up once, with masked edges (400 ms), when a fresh measurement arrives. */
function Roll({ text, animate }: { text: string; animate: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !animate) return;
    const inner = [...root.querySelectorAll<HTMLElement>('.ft-digit > span')];
    if (!inner[0] || !canAnimate(inner[0])) return;
    const anims = inner.map((el, i) =>
      el.animate(
        [
          { transform: 'translateY(70%)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        {
          duration: 400,
          delay: i * 30,
          easing: EASE.out,
          fill: 'backwards',
        },
      ),
    );
    return () => anims.forEach((a) => a.cancel());
  }, [text, animate]);
  return (
    <span ref={ref} aria-hidden="true" style={{ display: 'inline-flex' }}>
      {[...text].map((ch, i) => (
        <span key={i} className="ft-digit">
          <span>{ch}</span>
        </span>
      ))}
    </span>
  );
}

/** The exact-size placeholder for the number, shown only if the measurement takes longer than 150 ms. */
function DelayedSkeleton() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 150);
    return () => clearTimeout(t);
  }, []);
  return on ? <div className="ft-skeleton" /> : null;
}

function Readout({
  m,
  onRetry,
  mode,
  reduced,
}: {
  m: Measurement;
  onRetry(): void;
  mode: LensState['mode'];
  reduced: boolean;
}) {
  if (m.state === 'error') {
    return (
      <div className="ft-readout ft-o2" role="alert">
        <div className="ft-error">
          <span>
            <IconAlert />
            {LENS_ERROR}
          </span>
          <button type="button" className="ft-btn ft-btn--secondary" onClick={onRetry}>
            {TRY_AGAIN}
          </button>
        </div>
      </div>
    );
  }
  if (m.state === 'loading') {
    return (
      <div className="ft-readout ft-o2" aria-busy="true">
        <DelayedSkeleton />
      </div>
    );
  }
  const r = m.result;
  const text = lensReadout(r.identicalTenths);
  const identical = r.differing === 0;
  return (
    <div className="ft-readout ft-o2" role="status">
      <div className="ft-readout-number">
        <span className="ft-big" data-underline={mode === 'difference' ? '' : undefined}>
          <Roll text={text} animate={m.fresh && !reduced} />
          <span className="ft-sr">{text}</span>
        </span>
        <span className="ft-readout-word">{LENS_IDENTICAL_WORD}</span>
      </div>
      <p>{identical ? LENS_IDENTICAL_ALL : lensDiffering(r.differingTenths)}</p>
      {!identical && r.identicalTenths < 900 && <p className="ft-caption">{LENS_DIFFERENT}</p>}
    </div>
  );
}

function Picker({
  label,
  view,
  selected,
  onPick,
}: {
  label: string;
  view: FoldCardView;
  selected: string;
  onPick(id: string): void;
}) {
  return (
    <div className="ft-field ft-o4" role="group" aria-label={label}>
      <span className="ft-field-label" aria-hidden="true">
        {label}
      </span>
      <div className="ft-chips">
        {view.rungs.map((r) => (
          <button
            key={r.id}
            type="button"
            className="ft-chip"
            aria-pressed={r.id === selected}
            onClick={() => onPick(r.id)}
          >
            <img src={r.imageUrl} alt="" />
            <span className="ft-chip-text">
              <b>{r.price ? formatPrice(r.price.amount) : NO_PRICE_SHORT}</b>
              <span>{r.brand ?? NO_BRAND}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')];
}

export interface ProofLensProps {
  lens: LensState;
  view: FoldCardView;
  imageOf(id: string): string;
  measure: Measure;
  dispatch(a: OverlayAction): void;
  leaving: boolean;
  reduced: boolean;
}

export function ProofLens({ lens, view, imageOf, measure, dispatch, leaving, reduced }: ProofLensProps) {
  const dialog = useRef<HTMLDivElement>(null);
  // The element that opened the lens, captured before anything inside moves focus.
  const trigger = useRef<Element | null>(null);
  if (trigger.current === null) {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    trigger.current = el ?? document.body;
  }
  const { m, retry } = useMeasurement(lens.top, lens.bottom, measure);

  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
    const back = trigger.current;
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
    };
  }, []);

  // Cross-fade between the two views only when the mode flips, never while dragging the slider.
  const [switching, setSwitching] = useState(false);
  const firstMode = useRef(lens.mode);
  useEffect(() => {
    if (firstMode.current === lens.mode) return;
    firstMode.current = lens.mode;
    setSwitching(true);
    const t = setTimeout(() => setSwitching(false), 420);
    return () => clearTimeout(t);
  }, [lens.mode]);
  const fade = switching && !reduced ? 'opacity 400ms cubic-bezier(0.77, 0, 0.175, 1)' : 'none';

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialog.current) return;
    const items = focusables(dialog.current);
    if (items.length === 0) return;
    const root = dialog.current.getRootNode() as ShadowRoot | Document;
    const active = root.activeElement;
    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    if (e.shiftKey && (active === first || active === dialog.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const difference = lens.mode === 'difference';
  return (
    <div
      className="ft-scrim"
      data-leaving={leaving ? '' : undefined}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) dispatch({ type: 'close-lens' });
      }}
    >
      <div
        ref={dialog}
        className="ft-lens ft-ui"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ft-lens-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="ft-lens-head">
          <h2 className="ft-title" id="ft-lens-title">
            {LENS_TITLE}
          </h2>
          <button type="button" className="ft-btn" onClick={() => dispatch({ type: 'close-lens' })}>
            <IconClose />
            {CLOSE}
            <kbd className="ft-kbd">Esc</kbd>
          </button>
        </div>
        <div className="ft-lens-grid">
          <div className="ft-side">
            <div className="ft-viewport">
              <img src={imageOf(lens.bottom)} alt="" />
              <img
                className="ft-layer-top"
                src={imageOf(lens.top)}
                alt=""
                style={{ opacity: difference ? 0 : lens.blend / 100, transition: fade }}
              />
              <img
                className="ft-layer-diff"
                src={imageOf(lens.top)}
                alt=""
                style={{ opacity: difference ? 1 : 0, transition: fade }}
              />
            </div>
            <Picker
              label={LENS_TOP}
              view={view}
              selected={lens.top}
              onPick={(id) => dispatch({ type: 'lens-pick', side: 'top', id })}
            />
            <Picker
              label={LENS_BOTTOM}
              view={view}
              selected={lens.bottom}
              onPick={(id) => dispatch({ type: 'lens-pick', side: 'bottom', id })}
            />
          </div>
          <div className="ft-side">
            <Readout m={m} onRetry={retry} mode={lens.mode} reduced={reduced} />
            <div className="ft-field ft-o3" role="group" aria-label={LENS_MODE_LABEL}>
              <span className="ft-field-label" aria-hidden="true">
                {LENS_MODE_LABEL}
              </span>
              <div className="ft-segmented">
                <button
                  type="button"
                  aria-pressed={!difference}
                  onClick={() => dispatch({ type: 'lens-mode', mode: 'onion' })}
                >
                  {LENS_ONION}
                  <kbd className="ft-kbd">O</kbd>
                </button>
                <button
                  type="button"
                  aria-pressed={difference}
                  onClick={() => dispatch({ type: 'lens-mode', mode: 'difference' })}
                >
                  {LENS_DIFFERENCE}
                  <kbd className="ft-kbd">D</kbd>
                </button>
              </div>
            </div>
            <div className="ft-slider-row ft-o3">
              <div>
                <label htmlFor="ft-blend">{LENS_BLEND}</label>
                <span>{lens.blend}%</span>
              </div>
              <input
                id="ft-blend"
                className="ft-slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={lens.blend}
                disabled={difference}
                aria-describedby="ft-blend-hint"
                style={{ ['--fill' as string]: `${lens.blend}%` }}
                onChange={(e) => dispatch({ type: 'lens-blend', value: Number(e.target.value) })}
              />
              <span className="ft-caption" id="ft-blend-hint">
                {LENS_BLEND_HINT}
              </span>
            </div>
            <div className="ft-o3">
              <button
                type="button"
                className="ft-btn ft-btn--secondary"
                onClick={() => dispatch({ type: 'lens-swap' })}
              >
                {LENS_SWAP}
              </button>
            </div>
            <p className="ft-caption ft-o5">{LENS_METHOD}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
