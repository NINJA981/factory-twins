import type { TwinGroup } from '../types';

// What the overlay shows on top of the store grid: rings (F5), folds (F6), the Proof lens (F7).
// Pure reducer, so keyboard, pill clicks and manifest commands all go through one path.

export interface LensState {
  letter: string;
  /** Listing ids shown on top and bottom. */
  top: string;
  bottom: string;
  mode: 'onion' | 'difference';
  /** Onion-skin blend, 0 to 100. */
  blend: number;
}

export interface OverlayState {
  rings: boolean;
  folded: boolean;
  lens: LensState | null;
  /** Letter of the group whose badge or fold card has focus (target of `P`). */
  focusedLetter: string | null;
  /** The `?` shortcut list above the pill. */
  cheatsheet: boolean;
}

export type OverlayAction =
  | { type: 'toggle-rings' }
  | { type: 'set-rings'; on: boolean }
  | { type: 'toggle-fold' }
  | { type: 'focus-group'; letter: string | null }
  | { type: 'open-lens'; letter?: string }
  | { type: 'close-lens' }
  | { type: 'lens-pick'; side: 'top' | 'bottom'; id: string }
  | { type: 'lens-swap' }
  | { type: 'lens-mode'; mode: LensState['mode'] }
  | { type: 'lens-blend'; value: number }
  | { type: 'lens-nudge'; delta: number }
  /** The set of groups changed (re-scan, new page); drop references to groups that are gone. */
  | { type: 'groups-changed' }
  | { type: 'toggle-cheatsheet' }
  | { type: 'escape' };

export const INITIAL_OVERLAY: OverlayState = {
  rings: false,
  folded: false,
  lens: null,
  focusedLetter: null,
  cheatsheet: false,
};

/** Proof lens defaults (SPEC AC-F7.1): cheapest and priciest rung, else the first two members. */
export function defaultLensPair(group: TwinGroup): { top: string; bottom: string } | null {
  if (group.memberIds.length < 2) return null;
  if (group.brandTax && group.brandTax.lowId !== group.brandTax.highId) {
    return { top: group.brandTax.lowId, bottom: group.brandTax.highId };
  }
  return { top: group.memberIds[0] as string, bottom: group.memberIds[1] as string };
}

function clampBlend(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function overlayReducer(
  state: OverlayState,
  action: OverlayAction,
  groups: readonly TwinGroup[],
): OverlayState {
  const byLetter = (l: string | null | undefined) => (l ? groups.find((g) => g.letter === l) : undefined);
  switch (action.type) {
    case 'toggle-rings':
      return groups.length === 0 && !state.rings ? state : { ...state, rings: !state.rings };
    case 'set-rings':
      return { ...state, rings: action.on && groups.length > 0 };
    case 'toggle-fold':
      return groups.length === 0 && !state.folded ? state : { ...state, folded: !state.folded };
    case 'focus-group':
      return { ...state, focusedLetter: byLetter(action.letter) ? action.letter : null };
    case 'open-lens': {
      const group = byLetter(action.letter ?? state.focusedLetter) ?? groups[0];
      const pair = group ? defaultLensPair(group) : null;
      if (!group || !pair) return state;
      return { ...state, lens: { letter: group.letter, ...pair, mode: 'onion', blend: 50 } };
    }
    case 'close-lens':
      return state.lens ? { ...state, lens: null } : state;
    case 'escape':
      // Esc closes the lens first, then the cheatsheet (SPEC AC-F12.1).
      if (state.lens) return { ...state, lens: null };
      return state.cheatsheet ? { ...state, cheatsheet: false } : state;
    case 'toggle-cheatsheet':
      return { ...state, cheatsheet: !state.cheatsheet };
    case 'lens-pick': {
      const lens = state.lens;
      const group = byLetter(lens?.letter);
      if (!lens || !group || !group.memberIds.includes(action.id)) return state;
      const other = action.side === 'top' ? lens.bottom : lens.top;
      // Picking the photo already on the other side swaps them, so both sides never show the same one.
      if (other === action.id) return { ...state, lens: { ...lens, top: lens.bottom, bottom: lens.top } };
      return { ...state, lens: { ...lens, [action.side]: action.id } };
    }
    case 'lens-swap':
      return state.lens
        ? { ...state, lens: { ...state.lens, top: state.lens.bottom, bottom: state.lens.top } }
        : state;
    case 'lens-mode':
      return state.lens ? { ...state, lens: { ...state.lens, mode: action.mode } } : state;
    case 'lens-blend':
      return state.lens ? { ...state, lens: { ...state.lens, blend: clampBlend(action.value) } } : state;
    case 'lens-nudge':
      return state.lens
        ? { ...state, lens: { ...state.lens, blend: clampBlend(state.lens.blend + action.delta) } }
        : state;
    case 'groups-changed': {
      const lens = state.lens;
      const lensGroup = byLetter(lens?.letter);
      const lensOk =
        lens != null &&
        lensGroup != null &&
        lensGroup.memberIds.includes(lens.top) &&
        lensGroup.memberIds.includes(lens.bottom);
      return {
        rings: state.rings && groups.length > 0,
        folded: state.folded && groups.length > 0,
        lens: lensOk ? lens : null,
        focusedLetter: byLetter(state.focusedLetter) ? state.focusedLetter : null,
        cheatsheet: state.cheatsheet,
      };
    }
  }
}
