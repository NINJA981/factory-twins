// The Proof lens (DESIGN.md, Proof lens + "Cancel to black"): a native <dialog> (focus trap, Esc, focus
// return come from the platform) over two photos, with Onion skin and Difference modes, a slider that
// is also draggable on the photo itself (touch), and a readout measured by the engine's pixelDiff.
import type { LensState, OverlayAction, PixelDiffResult } from '@engine';
import {
  CLOSE,
  LENS_BLEND,
  LENS_BLEND_HINT,
  LENS_BOTTOM,
  LENS_DIFFERENCE,
  LENS_DIFFERENT,
  LENS_IDENTICAL_ALL,
  LENS_IDENTICAL_WORD,
  LENS_METHOD,
  LENS_MODE_LABEL,
  LENS_ONION,
  LENS_SWAP,
  LENS_TITLE,
  LENS_TOP,
  TRY_AGAIN,
  lensDiffering,
  lensReadout,
} from '@copy';
import { esc } from './dom';
import { icon } from './icons';
import type { Measure } from './measure';

export interface LensOption {
  id: string;
  imageUrl: string;
  /** Two text elements per option, as the design asks: price and brand. */
  price: string;
  brand: string;
}

export interface LensHooks {
  dispatch(action: OverlayAction): void;
  options(letter: string): LensOption[];
  measure: Measure;
  /** Reduced motion: no roll, no fade. */
  reduced(): boolean;
}

const LENS_ERROR_LOCAL = "Couldn't read one of these photos.";

export interface Lens {
  sync(state: LensState | null, opener?: HTMLElement | null): void;
  destroy(): void;
}

export function createLens(hooks: LensHooks): Lens {
  const dlg = document.createElement('dialog');
  dlg.className = 'lens';
  dlg.setAttribute('aria-labelledby', 'lens-title');
  // Same layout as the extension's ProofLens: a header row; the photo and the two pickers on the left;
  // the readout, the view switch, the blend slider and Swap on the right. On a phone it is one column in
  // the order photo, number, controls, picks (the o2 to o5 classes), so the number is above the fold.
  dlg.innerHTML = `<div class="lens-in">
<div class="lens-head"><h2 id="lens-title" class="lens-title">${esc(LENS_TITLE)}</h2><button type="button" class="btn btn-ghost lens-close" data-lens="close">${icon('x', 18)}<span>${esc(CLOSE)}</span><kbd class="keycap">Esc</kbd></button></div>
<div class="lens-grid">
<div class="lens-side">
<div class="lens-view" role="img" data-mode="onion"></div>
<div class="lens-pick o4" role="group" aria-label="${esc(LENS_TOP)}"><span class="field-label" aria-hidden="true">${esc(LENS_TOP)}</span><div class="lens-chips" data-chips="top"></div></div>
<div class="lens-pick o4" role="group" aria-label="${esc(LENS_BOTTOM)}"><span class="field-label" aria-hidden="true">${esc(LENS_BOTTOM)}</span><div class="lens-chips" data-chips="bottom"></div></div>
</div>
<div class="lens-side">
<div class="lens-readout o2" aria-live="polite" aria-atomic="true"></div>
<div class="lens-modes o3"><span class="field-label" id="lens-mode-label">${esc(LENS_MODE_LABEL)}</span>
<div class="segmented" role="radiogroup" aria-labelledby="lens-mode-label">
<button type="button" role="radio" data-lens="onion" aria-checked="true">${esc(LENS_ONION)}<kbd class="keycap">O</kbd></button>
<button type="button" role="radio" data-lens="difference" aria-checked="false">${esc(LENS_DIFFERENCE)}<kbd class="keycap">D</kbd></button>
</div></div>
<div class="lens-blend o3"><div class="lens-blend-row"><label for="lens-blend">${esc(LENS_BLEND)}</label><span data-blend-value>50%</span></div><input id="lens-blend" type="range" min="0" max="100" step="5" value="50" data-lens="blend" aria-describedby="lens-hint" style="--fill:50%"><p class="hint" id="lens-hint">${esc(LENS_BLEND_HINT)}</p></div>
<div class="o3"><button type="button" class="btn btn-secondary lens-swap" data-lens="swap">${icon('swap')}<span>${esc(LENS_SWAP)}</span></button></div>
<p class="hint lens-method o5">${esc(LENS_METHOD)}</p>
</div></div></div>`;
  document.body.append(dlg);

  const q = <T extends HTMLElement>(sel: string) => dlg.querySelector(sel) as T;
  const view = q<HTMLDivElement>('.lens-view');
  // Created here, not in the template: their src is set from the lens state before the dialog opens.
  const mkImg = (cls: string) => {
    const el = document.createElement('img');
    el.className = `lens-img ${cls}`;
    el.alt = '';
    el.draggable = false;
    view.append(el);
    return el;
  };
  const imgBottom = mkImg('lens-bottom');
  const imgTop = mkImg('lens-top');
  const imgDiff = mkImg('lens-diff');
  const chipsTop = q<HTMLDivElement>('[data-chips="top"]');
  const chipsBottom = q<HTMLDivElement>('[data-chips="bottom"]');
  const blendValue = q<HTMLSpanElement>('[data-blend-value]');
  const slider = q<HTMLInputElement>('[data-lens="blend"]');
  const readout = q<HTMLDivElement>('.lens-readout');
  const btnOnion = q<HTMLButtonElement>('[data-lens="onion"]');
  const btnDiff = q<HTMLButtonElement>('[data-lens="difference"]');

  let current: LensState | null = null;
  let currentLetter = '';
  let pairKey = '';
  let seq = 0;
  const rolled = new Set<string>();
  let opener: HTMLElement | null = null;

  // Events -> engine actions. The engine's reducer owns every value; this file only draws it.
  dlg.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-lens]');
    if (e.target === dlg) return hooks.dispatch({ type: 'close-lens' });
    if (!t) return;
    switch (t.dataset.lens) {
      case 'close':
        return hooks.dispatch({ type: 'close-lens' });
      case 'swap':
        return hooks.dispatch({ type: 'lens-swap' });
      case 'onion':
        return hooks.dispatch({ type: 'lens-mode', mode: 'onion' });
      case 'difference':
        return hooks.dispatch({ type: 'lens-mode', mode: 'difference' });
      case 'pick':
        return hooks.dispatch({
          type: 'lens-pick',
          side: t.dataset.side === 'bottom' ? 'bottom' : 'top',
          id: t.dataset.id ?? '',
        });
      case 'retry':
        pairKey = '';
        return current ? run(current) : undefined;
    }
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    hooks.dispatch({ type: 'escape' });
  });
  slider.addEventListener('input', () => hooks.dispatch({ type: 'lens-blend', value: Number(slider.value) }));

  // Touch and mouse drag on the photo scrubs the onion-skin blend horizontally (pointer events,
  // so one code path serves fingers, pens and mice). touch-action: none keeps the page from scrolling.
  let dragging = false;
  const scrub = (e: PointerEvent) => {
    const r = view.getBoundingClientRect();
    const v = ((e.clientX - r.left) / r.width) * 100;
    hooks.dispatch({ type: 'lens-blend', value: Math.round(v / 5) * 5 });
  };
  view.addEventListener('pointerdown', (e) => {
    if (current?.mode !== 'onion') return;
    dragging = true;
    view.setPointerCapture(e.pointerId);
    view.dataset.dragging = 'true';
    scrub(e);
  });
  view.addEventListener('pointermove', (e) => dragging && scrub(e));
  const end = (e: PointerEvent) => {
    dragging = false;
    delete view.dataset.dragging;
    if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId);
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);

  /** Thumbnail chips, one per listing in the group (price and brand), as in the extension. */
  function fillChips(box: HTMLDivElement, side: 'top' | 'bottom', opts: LensOption[], value: string) {
    const sig = opts.map((o) => o.id).join(',');
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig;
      box.innerHTML = opts
        .map(
          (o) =>
            `<button type="button" class="lens-chip" data-lens="pick" data-side="${side}" data-id="${esc(o.id)}" aria-pressed="false"><img src="${esc(o.imageUrl)}" alt="" width="28" height="28" decoding="async"><span class="lens-chip-text"><b>${esc(o.price)}</b><span>${esc(o.brand)}</span></span></button>`,
        )
        .join('');
    }
    for (const el of box.querySelectorAll<HTMLButtonElement>('.lens-chip'))
      el.setAttribute('aria-pressed', String(el.dataset.id === value));
  }

  function showReadout(res: PixelDiffResult, key: string) {
    const identical = res.differing === 0;
    const roll = !rolled.has(key) && !hooks.reduced();
    rolled.add(key);
    readout.innerHTML = `<p class="readout${roll ? ' is-rolling' : ''}"><span class="readout-num" data-text="${esc(lensReadout(res.identicalTenths))}">${esc(lensReadout(res.identicalTenths))}</span> <span class="readout-word">${esc(LENS_IDENTICAL_WORD)}</span></p>
<p class="readout-sub">${esc(identical ? LENS_IDENTICAL_ALL : lensDiffering(res.differingTenths))}</p>${res.identicalTenths < 900 ? `<p class="readout-note">${esc(LENS_DIFFERENT)}</p>` : ''}`;
  }

  async function run(state: LensState) {
    const opts = hooks.options(state.letter);
    const a = opts.find((o) => o.id === state.top);
    const b = opts.find((o) => o.id === state.bottom);
    if (!a || !b) return;
    const key = `${a.id}|${b.id}`;
    if (key === pairKey) return;
    pairKey = key;
    const mine = ++seq;
    // Skeleton the exact size of the readout, only if the measurement takes longer than 150 ms.
    const timer = setTimeout(() => {
      if (mine === seq) readout.innerHTML = '<div class="skeleton" aria-busy="true"></div>';
    }, 150);
    try {
      const res = await hooks.measure(a.imageUrl, b.imageUrl);
      if (mine !== seq) return;
      showReadout(res, key);
    } catch {
      if (mine !== seq) return;
      pairKey = '';
      readout.innerHTML = `<p class="readout-error">${icon('alert', 16)}<span>${esc(LENS_ERROR_LOCAL)}</span></p><button type="button" class="btn btn-secondary" data-lens="retry">${esc(TRY_AGAIN)}</button>`;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    sync(state, from) {
      if (!state) {
        seq++;
        pairKey = '';
        rolled.clear();
        current = null;
        if (dlg.open) {
          dlg.classList.add('is-closing');
          const done = () => {
            dlg.classList.remove('is-closing');
            if (!current) dlg.close();
            (opener ?? undefined)?.focus?.();
            opener = null;
          };
          if (hooks.reduced()) done();
          else setTimeout(done, 160);
        }
        return;
      }
      const wasOpen = dlg.open;
      const prev = current;
      current = state;
      if (!wasOpen) {
        opener = from ?? (document.activeElement as HTMLElement | null);
        rolled.clear();
        pairKey = '';
        dlg.classList.remove('is-closing');
        dlg.showModal();
      }
      const opts = hooks.options(state.letter);
      if (currentLetter !== state.letter) currentLetter = state.letter;
      const top = opts.find((o) => o.id === state.top);
      const bottom = opts.find((o) => o.id === state.bottom);
      if (!top || !bottom) return;
      fillChips(chipsTop, 'top', opts, state.top);
      fillChips(chipsBottom, 'bottom', opts, state.bottom);
      if (imgTop.getAttribute('src') !== top.imageUrl) imgTop.src = top.imageUrl;
      if (imgDiff.getAttribute('src') !== top.imageUrl) imgDiff.src = top.imageUrl;
      if (imgBottom.getAttribute('src') !== bottom.imageUrl) imgBottom.src = bottom.imageUrl;
      const diff = state.mode === 'difference';
      view.dataset.mode = state.mode;
      view.style.setProperty('--blend', String(state.blend / 100));
      btnOnion.setAttribute('aria-checked', String(!diff));
      btnDiff.setAttribute('aria-checked', String(diff));
      slider.value = String(state.blend);
      slider.style.setProperty('--fill', `${state.blend}%`);
      blendValue.textContent = `${state.blend}%`;
      slider.disabled = diff;
      view.setAttribute(
        'aria-label',
        diff
          ? 'Difference view. Black where the two photos match.'
          : `Onion skin view, ${state.blend}% of the top photo.`,
      );
      if (prev && prev.mode !== state.mode) readout.dataset.settled = diff ? 'true' : 'false';
      void run(state);
    },
    destroy() {
      dlg.remove();
    },
  };
}
