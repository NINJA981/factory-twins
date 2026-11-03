import type { ScanSummary } from '../cluster/groups';

// Summary pill state machine (SPEC AC-F4.2). Pure reducer; the overlay renders whatever it returns.

export type PillErrorReason =
  'not-search-page' | 'no-results-container' | 'unreadable-tiles' | 'hasher-failed';

export type PillState =
  | { kind: 'idle' }
  /** Site disabled in settings or auto pill off: no pill at all. */
  | { kind: 'paused' }
  | { kind: 'scanning'; done: number; total: number }
  | { kind: 'result'; summary: ScanSummary }
  | { kind: 'no-twins'; summary: ScanSummary }
  | { kind: 'error'; reason: PillErrorReason }
  /** Dismissed for this page with × or Esc (AC-F4.4). Stays dismissed across re-scans. */
  | { kind: 'dismissed' };

export type PillEvent =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'scan-start'; total: number }
  | { type: 'scan-progress'; done: number }
  | { type: 'scan-done'; summary: ScanSummary }
  | { type: 'scan-failed'; reason: PillErrorReason }
  /** Nothing worth a pill: not a results page, or a search with no results. */
  | { type: 'quiet' }
  | { type: 'dismiss' };

export const INITIAL_PILL: PillState = { kind: 'idle' };

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function pillReducer(state: PillState, event: PillEvent): PillState {
  if (state.kind === 'dismissed') return state;
  switch (event.type) {
    case 'dismiss':
      return { kind: 'dismissed' };
    case 'pause':
      return { kind: 'paused' };
    case 'resume':
      return state.kind === 'paused' ? { kind: 'idle' } : state;
    case 'scan-start': {
      if (state.kind === 'paused') return state;
      // A re-scan for lazy tiles keeps showing the last result instead of flashing "Checking…".
      if (state.kind === 'result' || state.kind === 'no-twins') return state;
      return { kind: 'scanning', done: 0, total: Math.max(0, Math.floor(event.total)) };
    }
    case 'scan-progress':
      if (state.kind !== 'scanning') return state;
      return { ...state, done: clampInt(event.done, state.done, state.total) };
    case 'scan-done':
      if (state.kind === 'paused') return state;
      return event.summary.twinGroups > 0
        ? { kind: 'result', summary: event.summary }
        : { kind: 'no-twins', summary: event.summary };
    case 'quiet':
      return state.kind === 'paused' ? state : { kind: 'idle' };
    case 'scan-failed':
      if (state.kind === 'paused') return state;
      // Keep a good result on screen if a later lazy-tile re-scan fails.
      if (state.kind === 'result' || state.kind === 'no-twins') return state;
      return { kind: 'error', reason: event.reason };
  }
}

/** True when the overlay should show a pill element at all. */
export function pillVisible(state: PillState): boolean {
  return (
    state.kind === 'scanning' ||
    state.kind === 'result' ||
    state.kind === 'no-twins' ||
    state.kind === 'error'
  );
}
