import type { StoreAdapter } from '../adapters/types';
import { debounce } from '../core/async';

// Small DOM helpers for the content script. No extension APIs.

/** True when keystrokes belong to a text field (single-key shortcuts stay off, AC-F12.1). */
export function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  if (el.closest('[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'))
    return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag !== 'input') return false;
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(
    type,
  );
}

/** Follows focus into open shadow roots (our overlay lives in one). */
export function deepActiveElement(doc: Document): Element | null {
  let el: Element | null = doc.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

export const LAZY_TILE_DEBOUNCE_MS = 250;

/**
 * Watches the results container for tiles that load after scroll (AC-F1.3). Calls `onNewTiles`
 * (debounced) only when a tile id appears that was not seen before, so known tiles are never
 * re-hashed. Returns a stop function.
 */
export function watchNewTiles(
  adapter: StoreAdapter,
  container: Element,
  seen: Set<string>,
  onNewTiles: (ids: string[]) => void,
  debounceMs: number = LAZY_TILE_DEBOUNCE_MS,
): () => void {
  const fire = debounce(() => {
    const fresh: string[] = [];
    for (const tile of adapter.findTiles(container)) {
      const id = adapter.tileId(tile);
      if (id && !seen.has(id)) {
        seen.add(id);
        fresh.push(id);
      }
    }
    if (fresh.length > 0) onNewTiles(fresh);
  }, debounceMs);
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.addedNodes.length > 0)) fire();
  });
  observer.observe(container, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    fire.cancel();
  };
}
