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
import type { QuerySession, Settings } from '../core/types';
import type { TabSummary } from '../messaging/protocol';
import { deepActiveElement, isEditableTarget, watchNewTiles } from './dom';
import { scanDocument, type ScanClient } from './scan';

// The content script's brain, with every browser-extension call behind `ControllerClient`, so it
// runs in happy-dom tests and (later) in the web app. React only renders what this exposes.

export interface ControllerClient extends ScanClient {
  getSettings(): Promise<Settings>;
  reportSummary(summary: TabSummary): Promise<void>;
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
  getState(): ControllerState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  stop(): void;
  /** Rescans now (settings changed, session cleared). */
  rescan(): Promise<void>;
  dispatch(action: OverlayAction): void;
  pill(event: PillEvent): void;
  applySettings(settings: Settings): void;
  /** Manifest command or pill button. */
  runAction(action: KeyAction): void;
  runCommand(command: string): void;
  handleKeydown(e: KeyboardEvent): boolean;
}

export interface ControllerOptions {
  adapter: StoreAdapter;
  doc: Document;
  href: string;
  client: ControllerClient;
  /** Debounce for lazy tile rescans. */
  lazyDebounceMs?: number;
}

export function createController(opts: ControllerOptions): Controller {
  const { adapter, doc, client } = opts;
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
      const outcome = await scanDocument({
        adapter,
        doc,
        href: opts.href,
        client,
        settings,
        localLetters,
        onStart: (total) => pill({ type: 'scan-start', total }),
        onProgress: (done) => pill({ type: 'scan-progress', done }),
      });
      if (stopped) return;
      if (!outcome.ok) {
        pill({ type: 'scan-failed', reason: outcome.reason });
        return;
      }
      Object.assign(localLetters, outcome.result.letters);
      const next: ControllerState = {
        ...state,
        pill: pillReducer(state.pill, { type: 'scan-done', summary: outcome.result.summary }),
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
      default:
        return dispatch({ type: 'lens-nudge', delta: lensNudgeDelta(action) });
    }
  }

  return {
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
    dispatch,
    pill,
    applySettings(settings) {
      const wasEnabled = state.settings ? enabled(state.settings) : false;
      set({ settings });
      if (!enabled(settings)) {
        pill({ type: 'pause' });
        set({ overlay: INITIAL_OVERLAY });
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
    handleKeydown(e) {
      const action = resolveKey(e, {
        singleKeys: state.settings?.singleKeys ?? false,
        editableFocus: isEditableTarget(deepActiveElement(doc)),
        hasPill: state.pill.kind === 'result' || state.pill.kind === 'no-twins',
        lensOpen: state.overlay.lens != null,
      });
      if (!action) return false;
      // Esc only belongs to us while the lens is open; otherwise the store keeps it.
      if (action === 'escape' && !state.overlay.lens) return false;
      runAction(action);
      return true;
    },
  };
}
