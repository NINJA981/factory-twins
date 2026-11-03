import type { StoreAdapter } from '../adapters/types';
import { debounce } from '../core/async';
import type { ClusterResult } from '../core/cluster/groups';
import { commandAction, lensNudgeDelta, resolveKey, type KeyAction } from '../core/keyboard';
import {
  INITIAL_OVERLAY,
  overlayReducer,
  type OverlayAction,
  type OverlayState,
} from '../core/state/overlay';
import { INITIAL_PILL, pillReducer, type PillEvent, type PillState } from '../core/state/pill';
import type { Listing, QuerySession, Settings } from '../core/types';
import type { PixelDiffReply, TabSummary } from '../messaging/protocol';
import { deepActiveElement, isEditableTarget, watchNewTiles } from './dom';
import { scanDocument, type ScanClient } from './scan';

// The content script's brain, with every browser-extension call behind `ControllerClient`, so it
// runs in happy-dom tests and (later) in the web app. React only renders what this exposes.

export interface ControllerClient extends ScanClient {
  getSettings(): Promise<Settings>;
  reportSummary(summary: TabSummary): Promise<void>;
  /** Proof lens measurement of two photos (SPEC AC-F7.4), computed in the hasher context. */
  pixelDiff(req: { store: Listing['store']; a: string; b: string }): Promise<PixelDiffReply>;
}

export interface ControllerState {
  pill: PillState;
  overlay: OverlayState;
  result: ClusterResult | null;
  session: QuerySession | null;
  settings: Settings | null;
  page: number;
  /** Listing id to tile element, for the overlay (rings, fold). */
  tilesById: ReadonlyMap<string, Element>;
}

export interface Controller {
  /** The store adapter, for the overlay's pill placement and fold insertion points. */
  readonly adapter: StoreAdapter;
  getState(): ControllerState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  stop(): void;
  /** Rescans now (settings changed, session cleared). */
  rescan(): Promise<void>;
  /**
   * Called on an interval and on history events. A new search (the store routed client-side to a
   * new query or page) starts over with an empty page state; a replaced results container is
   * watched again. Returns what it did, for tests.
   */
  checkPage(): 'unchanged' | 'navigated' | 'reattached';
  dispatch(action: OverlayAction): void;
  pill(event: PillEvent): void;
  applySettings(settings: Settings): void;
  /** Manifest command or pill button. */
  runAction(action: KeyAction): void;
  runCommand(command: string): void;
  /** Measures how many pixels differ between two listings' photos. */
  measure(topId: string, bottomId: string): Promise<PixelDiffReply>;
  handleKeydown(e: KeyboardEvent): boolean;
}

export interface ControllerOptions {
  adapter: StoreAdapter;
  doc: Document;
  /** The page URL, read at every scan: stores such as Walmart route to a new search without a reload. */
  href: string | (() => string);
  client: ControllerClient;
  /** Debounce for lazy tile rescans. */
  lazyDebounceMs?: number;
}

export function createController(opts: ControllerOptions): Controller {
  const { adapter, doc, client } = opts;
  const currentHref = typeof opts.href === 'function' ? opts.href : () => opts.href as string;
  /** The URL the current page state belongs to; a different one means the shopper searched again. */
  let pageHref = currentHref();
  let watched: Element | null = null;
  let state: ControllerState = {
    pill: INITIAL_PILL,
    overlay: INITIAL_OVERLAY,
    result: null,
    session: null,
    settings: null,
    page: 1,
    tilesById: new Map(),
  };
  const listeners = new Set<() => void>();
  let stopWatch: (() => void) | null = null;
  let stopped = false;
  let scanning = false;
  let again = false;
  const seen = new Set<string>();
  const localLetters: Record<string, string> = {};

  const emit = () => {
    for (const l of [...listeners]) l();
  };
  const set = (patch: Partial<ControllerState>) => {
    state = { ...state, ...patch };
    emit();
  };
  const groupsOf = (s: ControllerState) => s.result?.groups ?? [];

  const tell = (summary: TabSummary) => {
    void client.reportSummary(summary).catch(() => undefined);
  };
  let lastProgressAt = 0;
  const pill = (event: PillEvent) => set({ pill: pillReducer(state.pill, event) });
  const dispatch = (action: OverlayAction) =>
    set({ overlay: overlayReducer(state.overlay, action, groupsOf(state)) });

  function enabled(s: Settings): boolean {
    return s.stores[adapter.store] && s.autoPill;
  }

  async function scan(): Promise<void> {
    const settings = state.settings;
    if (!settings || !enabled(settings) || stopped) return;
    if (scanning) {
      again = true;
      return;
    }
    scanning = true;
    try {
      const href = currentHref();
      const outcome = await scanDocument({
        adapter,
        doc,
        href,
        client,
        settings,
        localLetters,
        onStart: (total) => {
          pill({ type: 'scan-start', total });
          // A re-scan for lazy tiles keeps the last result, so the popup keeps it too.
          if (state.pill.kind === 'scanning')
            tell({ status: 'scanning', store: adapter.store, done: 0, total });
        },
        onProgress: (done) => {
          pill({ type: 'scan-progress', done });
          const now = Date.now();
          if (state.pill.kind === 'scanning' && now - lastProgressAt >= 200) {
            lastProgressAt = now;
            tell({ status: 'scanning', store: adapter.store, done, total: state.pill.total });
          }
        },
      });
      // The shopper moved on while this scan ran: its result belongs to the old search.
      if (stopped || !sameSearch(href, pageHref)) return;
      if (!outcome.ok) {
        // Not a results page (a store page under /s, a category hub): nothing to say, and no
        // "layout changed" alarm either.
        if (outcome.reason === 'not-search-page') {
          pill({ type: 'quiet' });
          return;
        }
        pill({ type: 'scan-failed', reason: outcome.reason });
        if (state.pill.kind === 'error')
          tell({ status: 'error', store: adapter.store, adapterVersion: adapter.version });
        return;
      }
      Object.assign(localLetters, outcome.result.letters);
      const empty = outcome.result.summary.listings === 0;
      const next: ControllerState = {
        ...state,
        // A search with no results is not a broken layout: the pill stays away.
        pill: pillReducer(
          state.pill,
          empty ? { type: 'quiet' } : { type: 'scan-done', summary: outcome.result.summary },
        ),
        result: outcome.result,
        session: outcome.session,
        page: outcome.page,
        tilesById: outcome.tilesById,
      };
      let overlay = overlayReducer(state.overlay, { type: 'groups-changed' }, groupsOf(next));
      if (settings.autoRings && !overlay.rings) {
        overlay = overlayReducer(overlay, { type: 'set-rings', on: true }, groupsOf(next));
      }
      state = { ...next, overlay };
      emit();
      const s = outcome.result.summary;
      await client
        .reportSummary({
          status: 'ready',
          store: adapter.store,
          listings: s.listings,
          products: s.products,
          twinGroups: s.twinGroups,
          maxBrandTaxDollars: s.maxBrandTaxDollars,
        })
        .catch(() => undefined);
    } finally {
      scanning = false;
      if (again && !stopped) {
        again = false;
        void scan();
      }
    }
  }

  function startWatching(): void {
    stopWatch?.();
    const container = adapter.resultsContainer(doc);
    watched = container;
    const root = container ?? doc.body;
    if (!root) return;
    for (const tile of adapter.findTiles(root)) {
      const id = adapter.tileId(tile);
      if (id) seen.add(id);
    }
    if (container) {
      stopWatch = watchNewTiles(adapter, container, seen, () => void scan(), opts.lazyDebounceMs);
      return;
    }
    // The store has not rendered its results yet: watch the body until the container shows up.
    const retry = debounce(() => {
      if (adapter.resultsContainer(doc)) {
        startWatching();
        void scan();
      }
    }, opts.lazyDebounceMs ?? 250);
    const observer = new MutationObserver(retry);
    observer.observe(root, { childList: true, subtree: true });
    stopWatch = () => {
      observer.disconnect();
      retry.cancel();
    };
  }

  function runAction(action: KeyAction): void {
    switch (action) {
      case 'toggle-rings':
        return dispatch({ type: 'toggle-rings' });
      case 'toggle-fold':
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
        return dispatch({ type: 'lens-nudge', delta: lensNudgeDelta(action) });
    }
  }

  function sameSearch(a: string, b: string): boolean {
    try {
      const qa = adapter.readQuery(new URL(a));
      const qb = adapter.readQuery(new URL(b));
      if (!qa || !qb) return a === b;
      return JSON.stringify(qa) === JSON.stringify(qb);
    } catch {
      return a === b;
    }
  }

  function checkPage(): 'unchanged' | 'navigated' | 'reattached' {
    if (stopped || !state.settings || !enabled(state.settings)) return 'unchanged';
    const href = currentHref();
    if (!sameSearch(href, pageHref)) {
      pageHref = href;
      seen.clear();
      for (const k of Object.keys(localLetters)) delete localLetters[k];
      state = {
        ...state,
        // A dismissed pill was dismissed for that page only (AC-F4.4).
        pill: state.pill.kind === 'paused' ? state.pill : INITIAL_PILL,
        overlay: INITIAL_OVERLAY,
        result: null,
        session: null,
        page: 1,
        tilesById: new Map(),
      };
      emit();
      startWatching();
      void scan();
      return 'navigated';
    }
    pageHref = href;
    if (watched && !watched.isConnected) {
      startWatching();
      void scan();
      return 'reattached';
    }
    return 'unchanged';
  }

  return {
    adapter,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start() {
      stopped = false;
      const settings = await client.getSettings();
      set({ settings });
      if (!enabled(settings)) {
        pill({ type: 'pause' });
        tell({ status: 'off', store: adapter.store });
        return;
      }
      startWatching();
      await scan();
    },
    stop() {
      stopped = true;
      stopWatch?.();
      stopWatch = null;
      listeners.clear();
    },
    rescan: scan,
    checkPage,
    dispatch,
    pill,
    applySettings(settings) {
      const wasEnabled = state.settings ? enabled(state.settings) : false;
      set({ settings });
      if (!enabled(settings)) {
        pill({ type: 'pause' });
        set({ overlay: INITIAL_OVERLAY });
        tell({ status: 'off', store: adapter.store });
      } else if (!wasEnabled) {
        pill({ type: 'resume' });
        startWatching();
        void scan();
      } else {
        void scan();
      }
    },
    runAction,
    runCommand(command) {
      const action = commandAction(command);
      if (action) runAction(action);
    },
    async measure(topId, bottomId) {
      const listings = state.session?.listings ?? {};
      const a = listings[topId]?.imageUrl;
      const b = listings[bottomId]?.imageUrl;
      if (!a || !b) return { ok: false, error: 'invalid-url' };
      try {
        return await client.pixelDiff({ store: adapter.store, a, b });
      } catch {
        return { ok: false, error: 'network' };
      }
    },
    handleKeydown(e) {
      const action = resolveKey(e, {
        singleKeys: state.settings?.singleKeys ?? false,
        editableFocus: isEditableTarget(deepActiveElement(doc)),
        hasPill: state.pill.kind === 'result' || state.pill.kind === 'no-twins',
        lensOpen: state.overlay.lens != null,
      });
      if (!action) return false;
      // Esc only belongs to us while the lens or the cheatsheet is open; otherwise the store keeps it.
      if (action === 'escape' && !state.overlay.lens && !state.overlay.cheatsheet) return false;
      runAction(action);
      return true;
    },
  };
}
