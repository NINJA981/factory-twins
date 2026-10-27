// The stage: a grid of tiles plus the overlay on top of it (pill, rings, fold cards, Proof lens).
// All behaviour comes from the engine's own state machines: overlayReducer for rings, fold and lens,
// pillReducer for the pill, resolveKey for the keyboard. This file only draws their state.
import {
  INITIAL_OVERLAY,
  INITIAL_PILL,
  commandAction,
  lensNudgeDelta,
  overlayReducer,
  pillReducer,
  pillVisible,
  resolveKey,
  type ClusterResult,
  type KeyAction,
  type Listing,
  type OverlayAction,
  type OverlayState,
  type PillEvent,
  type PillState,
  type ScanSummary,
} from '@engine';
import {
  PILL_ERROR,
  FOLD_TWINS,
  NO_BRAND,
  UNFOLD_TWINS,
  foldAnnouncement,
  foldDetail,
  pillScanning,
} from '@copy';
import { editableFocus, esc, prefersReducedMotion } from './dom';
import { createFolder, type Folder } from './fold';
import { glyph, icon } from './icons';
import { createLens, type Lens } from './lens';
import type { Measure } from './measure';
import { gridHtml, pillHtml, priceText, type StageData } from './templates';

export interface Stage {
  readonly state: OverlayState;
  dispatch(action: OverlayAction, opener?: HTMLElement | null): void;
  setPill(event: PillEvent): void;
  /** Forget the previous pill (a new scan starts from nothing, including a dismissed pill). */
  resetPill(): void;
  /** Replace the data (web app): re-renders the grid, resets rings and folds, refreshes the lens. */
  setData(
    data: StageData,
    opts?: {
      imgAttrs?: (l: Listing, i: number) => string;
      compact?: boolean;
      extra?: (l: Listing) => string;
    },
  ): void;
  /** Fires after every state change with the previous and next state. */
  onChange(fn: (next: OverlayState, prev: OverlayState) => void): void;
  readonly folder: Folder;
  destroy(): void;
}

export interface StageOptions {
  root: HTMLElement;
  data: StageData;
  measure: Measure;
  /** Keep the existing static markup (landing) instead of rendering it. */
  hydrate?: boolean;
  /** Listen for single-key shortcuts while the stage is on screen or focused. */
  keyboard?: boolean;
  /** Initial pill state; the landing page hydrates a static "result" pill. */
  pill?: PillState;
}

export function mountStage(opts: StageOptions): Stage {
  const { root, measure } = opts;
  let data = opts.data;
  const grid = root.querySelector<HTMLElement>('.grid') as HTMLElement;
  const dock = root.querySelector<HTMLElement>('[data-pill-dock]') as HTMLElement;
  const live = root.querySelector<HTMLElement>('[data-live]') as HTMLElement;
  let state: OverlayState = INITIAL_OVERLAY;
  let pill: PillState = opts.pill ?? INITIAL_PILL;
  let keyboardFolded = false;
  const listeners: Array<(n: OverlayState, p: OverlayState) => void> = [];
  const reduced = () => prefersReducedMotion();

  const folder = createFolder(grid, { reduced, onSettled: (folded) => settled(folded) });
  const byId = () => Object.fromEntries(data.listings.map((l) => [l.id, l])) as Record<string, Listing>;

  const lens: Lens = createLens({
    dispatch: (a) => dispatch(a),
    measure,
    reduced,
    options(letter) {
      const g = data.result.groups.find((x) => x.letter === letter);
      const map = byId();
      return (g?.memberIds ?? []).flatMap((id) => {
        const l = map[id];
        return l ? [{ id, imageUrl: l.imageUrl, price: priceText(l), brand: l.brand ?? NO_BRAND }] : [];
      });
    },
  });

  function renderPill() {
    if (!dock) return;
    if (!pillVisible(pill)) {
      dock.replaceChildren();
      return;
    }
    const folded = state.folded;
    if (pill.kind === 'result' || pill.kind === 'no-twins') {
      dock.innerHTML = pillHtml(pill.summary, { hasGroups: pill.kind === 'result', folded });
    } else if (pill.kind === 'scanning') {
      const pct = pill.total ? Math.round((pill.done / pill.total) * 100) : 0;
      dock.innerHTML = `<div class="pill pill-scanning" role="status" data-pill>${glyph(16)}<span class="seg">${esc(pillScanning(pill.done, pill.total))}</span><span class="pill-progress" style="--p:${pct}%"></span></div>`;
    } else if (pill.kind === 'error') {
      dock.innerHTML = `<div class="pill pill-error" role="alert" data-pill>${icon('alert', 16)}<span class="seg">${esc(PILL_ERROR)}</span></div>`;
    }
    syncPillState();
  }

  function syncPillState() {
    dock?.querySelector('button.pill-main')?.setAttribute('aria-pressed', String(state.rings));
    const label = dock?.querySelector('.fold-label');
    if (label) label.textContent = state.folded ? UNFOLD_TWINS : FOLD_TWINS;
  }

  function sync(prev: OverlayState) {
    root.dataset.rings = String(state.rings);
    root.dataset.folded = String(state.folded);
    syncPillState();
    if (prev.folded !== state.folded) {
      if (state.folded) folder.fold();
      else folder.unfold();
    }
    if (prev.lens !== state.lens) {
      lens.sync(state.lens, pendingOpener);
      pendingOpener = null;
    } else if (state.lens) lens.sync(state.lens);
    for (const fn of listeners) fn(state, prev);
  }

  function settled(folded: boolean) {
    if (!folded) {
      live.textContent = 'Unfolded.';
      return;
    }
    const map = byId();
    const lines = data.result.groups.map((g) => {
      const lo = g.brandTax ? (map[g.brandTax.lowId]?.price?.amount ?? null) : null;
      const hi = g.brandTax ? (map[g.brandTax.highId]?.price?.amount ?? null) : null;
      return foldDetail(g.letter, g.memberIds.length, lo, hi);
    });
    live.textContent = `${foldAnnouncement(data.result.groups.length)} ${lines.join(' ')}`;
    if (keyboardFolded) {
      keyboardFolded = false;
      grid.querySelector<HTMLElement>('.fold-card .fold-title')?.setAttribute('tabindex', '-1');
      grid.querySelector<HTMLElement>('.fold-card .fold-title')?.focus({ preventScroll: false });
    }
  }

  let pendingOpener: HTMLElement | null = null;

  function dispatch(action: OverlayAction, opener?: HTMLElement | null) {
    const prev = state;
    if (opener) pendingOpener = opener;
    state = overlayReducer(state, action, data.result.groups);
    if (state === prev) {
      pendingOpener = null;
      return;
    }
    sync(prev);
  }

  function runKey(a: KeyAction, fromKeyboard: boolean) {
    switch (a) {
      case 'toggle-rings':
        return dispatch({ type: 'toggle-rings' });
      case 'toggle-fold':
        keyboardFolded = fromKeyboard && !state.folded;
        return dispatch({ type: 'toggle-fold' });
      case 'open-lens':
        return dispatch({ type: 'open-lens' });
      case 'escape':
        return dispatch({ type: 'escape' });
      case 'toggle-cheatsheet':
        return dispatch({ type: 'toggle-cheatsheet' });
      case 'lens-onion':
        return dispatch({ type: 'lens-mode', mode: 'onion' });
      case 'lens-difference':
        return dispatch({ type: 'lens-mode', mode: 'difference' });
      default:
        return dispatch({ type: 'lens-nudge', delta: lensNudgeDelta(a) });
    }
  }

  // Click delegation: pill, badges, fold-card footer.
  const onClick = (e: Event) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t || !root.contains(t)) return;
    switch (t.dataset.act) {
      case 'rings':
        return dispatch({ type: 'toggle-rings' });
      case 'fold':
        return dispatch({ type: 'toggle-fold' });
      case 'unfold':
        return state.folded ? dispatch({ type: 'toggle-fold' }) : undefined;
      case 'lens':
        return dispatch({ type: 'open-lens', letter: t.dataset.letter }, t);
      case 'dismiss':
        pill = pillReducer(pill, { type: 'dismiss' });
        return renderPill();
    }
  };
  root.addEventListener('click', onClick);
  root.addEventListener('focusin', (e) => {
    const l = (e.target as HTMLElement).closest<HTMLElement>('[data-letter]')?.dataset.letter ?? null;
    if (l) dispatch({ type: 'focus-group', letter: l });
  });

  let visible = false;
  const io =
    typeof IntersectionObserver === 'function'
      ? // Any overlap counts. A 25% threshold made the keys dead on a full results page: 60 tiles are
        // about 3,900 px tall, so no viewport ever shows a quarter of the stage.
        new IntersectionObserver((es) => es.forEach((en) => (visible = en.isIntersecting)))
      : null;
  io?.observe(root);

  const onKey = (e: KeyboardEvent) => {
    const active = visible || root.contains(document.activeElement) || state.lens != null;
    if (!active) return;
    const act = resolveKey(e, {
      singleKeys: true,
      editableFocus: editableFocus(),
      hasPill: pillVisible(pill) || state.lens != null,
      lensOpen: state.lens != null,
    });
    if (!act) return;
    e.preventDefault();
    runKey(act, true);
  };
  if (opts.keyboard !== false) document.addEventListener('keydown', onKey);

  function render(o?: Parameters<Stage['setData']>[1]) {
    grid.innerHTML = gridHtml(data, o);
    grid.dataset.state = 'idle';
  }

  if (!opts.hydrate) {
    render();
    renderPill();
  } else {
    // Static markup stays; the pill in the HTML already matches the engine's summary.
    root.dataset.rings = 'false';
    root.dataset.folded = String(grid.dataset.state === 'folded');
    if (grid.dataset.state === 'folded') state = { ...state, folded: true };
  }

  return {
    get state() {
      return state;
    },
    folder,
    dispatch,
    setPill(event) {
      pill = pillReducer(pill, event);
      renderPill();
    },
    resetPill() {
      pill = INITIAL_PILL;
      renderPill();
    },
    setData(next, o) {
      folder.settle();
      data = next;
      render(o);
      const prev = state;
      state = overlayReducer(INITIAL_OVERLAY, { type: 'groups-changed' }, data.result.groups);
      root.dataset.rings = 'false';
      root.dataset.folded = 'false';
      lens.sync(null);
      renderPill();
      for (const fn of listeners) fn(state, prev);
    },
    onChange(fn) {
      listeners.push(fn);
    },
    destroy() {
      root.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      io?.disconnect();
      folder.destroy();
      lens.destroy();
    },
  };
}

/** Handy for callers that need the summary for the pill without building a StageData by hand. */
export function summaryOf(result: ClusterResult): ScanSummary {
  return result.summary;
}

export { commandAction };
