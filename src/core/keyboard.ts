// In-page single keys (SPEC AC-F12.1) and manifest commands (AC-F12.2) mapped to overlay actions.
// The DOM side decides `editableFocus`; this module only decides what a key means.

export type KeyAction =
  | 'toggle-rings'
  | 'toggle-fold'
  | 'open-lens'
  | 'escape'
  | 'lens-nudge-small-up'
  | 'lens-nudge-small-down'
  | 'lens-nudge-large-up'
  | 'lens-nudge-large-down';

export interface KeyInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing?: boolean;
}

export interface KeyContext {
  singleKeys: boolean;
  /** A text field, select, contenteditable or the store's search box has focus. */
  editableFocus: boolean;
  /** The page shows a pill (shortcuts are inert otherwise). */
  hasPill: boolean;
  lensOpen: boolean;
}

export const LENS_STEP_SMALL = 5;
export const LENS_STEP_LARGE = 25;

export function resolveKey(e: KeyInput, ctx: KeyContext): KeyAction | null {
  if (e.isComposing || !ctx.hasPill) return null;
  if (e.key === 'Escape') return 'escape';
  if (ctx.lensOpen) {
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      return e.shiftKey ? 'lens-nudge-large-up' : 'lens-nudge-small-up';
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      return e.shiftKey ? 'lens-nudge-large-down' : 'lens-nudge-small-down';
    }
  }
  if (!ctx.singleKeys || ctx.editableFocus || e.repeat) return null;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;
  switch (e.key.toLowerCase()) {
    case 't':
      return 'toggle-rings';
    case 'f':
      return 'toggle-fold';
    case 'p':
      return 'open-lens';
    default:
      return null;
  }
}

export function lensNudgeDelta(action: KeyAction): number {
  switch (action) {
    case 'lens-nudge-small-up':
      return LENS_STEP_SMALL;
    case 'lens-nudge-small-down':
      return -LENS_STEP_SMALL;
    case 'lens-nudge-large-up':
      return LENS_STEP_LARGE;
    case 'lens-nudge-large-down':
      return -LENS_STEP_LARGE;
    default:
      return 0;
  }
}

/** Manifest command names (wxt.config.ts) to actions. */
export function commandAction(command: string): KeyAction | null {
  if (command === 'ring-twins') return 'toggle-rings';
  if (command === 'fold-twins') return 'toggle-fold';
  return null;
}
