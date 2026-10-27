// "Fold twins": the signature moment, frame by frame as DESIGN.md specifies it. WAAPI only; animates
// transform, opacity and clip-path. The layout commits at t = 0 (members hidden, cards shown) and every
// moving piece is a FLIP or a fill-both animation on top of that final layout, so pressing F again
// mid-fold can simply reverse() everything from its current time.
//
// Contract with the markup: `grid` holds `.tile` elements and pre-inserted `.fold-card[data-letter]`
// elements; `grid.dataset.state` is "idle" or "folded"; CSS hides twin tiles / cards by that state.

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_OUT_SOFT = 'cubic-bezier(0.25, 1, 0.5, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const SPRING_PLAYFUL = 'linear(0, 0.157, 0.48, 0.79, 1.01, 1.11, 1.12, 1.08, 1.03, 0.99, 0.98, 0.99, 1)';
const MAX_GHOSTS = 12;

type Phase = 'idle' | 'folded' | 'folding' | 'unfolding';

export interface Folder {
  readonly phase: Phase;
  fold(): void;
  unfold(): void;
  /** Jump to the settled state of the current phase without animating. */
  settle(): void;
  destroy(): void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function createFolder(
  grid: HTMLElement,
  opts: { reduced: () => boolean; onSettled?: (folded: boolean) => void },
): Folder {
  let phase: Phase = grid.dataset.state === 'folded' ? 'folded' : 'idle';
  let running: Animation[] = [];
  let layer: HTMLElement | null = null;
  let token = 0;

  const rel = (el: Element): Rect => {
    const g = grid.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height };
  };
  const tiles = () => [...grid.querySelectorAll<HTMLElement>(':scope > .tile')];
  const cards = () => [...grid.querySelectorAll<HTMLElement>(':scope > .fold-card')];
  const media = (t: HTMLElement) => (t.querySelector('.tile-media') ?? t) as HTMLElement;

  function ensureLayer(): HTMLElement {
    if (!layer || !layer.isConnected) {
      layer = document.createElement('div');
      layer.className = 'ghost-layer';
      layer.setAttribute('aria-hidden', 'true');
      grid.append(layer);
    }
    return layer;
  }

  function ghost(src: string, r: Rect): HTMLImageElement {
    const g = document.createElement('img');
    g.className = 'ghost';
    g.src = src;
    g.alt = '';
    g.draggable = false;
    Object.assign(g.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    ensureLayer().append(g);
    return g;
  }

  const anim = (el: Element, keyframes: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, { fill: 'both', ...o });
    running.push(a);
    return a;
  };

  /** Removes everything the animation added; the settled DOM state is whatever data-state says. */
  function cleanup() {
    token++;
    for (const a of running) a.cancel();
    running = [];
    layer?.replaceChildren();
    for (const t of tiles()) t.classList.remove('is-returning');
  }

  function finish(next: Phase) {
    cleanup();
    phase = next;
    grid.dataset.state = next === 'folded' ? 'folded' : 'idle';
    opts.onSettled?.(next === 'folded');
  }

  /** Waits for every running animation to end, then settles. */
  function settleAfter(next: Phase, anims: Animation[]) {
    const mine = ++token;
    if (anims.length === 0) return finish(next);
    Promise.allSettled(anims.map((a) => a.finished)).then(() => {
      if (token === mine && (phase === 'folding' || phase === 'unfolding')) finish(next);
    });
  }

  function fold() {
    if (phase === 'folded' || phase === 'folding') return;
    if (phase === 'unfolding') cleanup();
    delete grid.dataset.boot;
    const reduced = opts.reduced();
    const allTiles = tiles();
    const members = allTiles.filter((t) => t.hasAttribute('data-twin'));
    const others = allTiles.filter((t) => !t.hasAttribute('data-twin'));
    if (members.length === 0) return;

    // FIRST
    const firstOthers = new Map(others.map((t) => [t, rel(t)]));
    const firstMedia = new Map(members.map((t) => [t, rel(media(t))]));

    // Commit the layout: members out, cards in.
    grid.dataset.state = 'folded';
    phase = 'folding';
    running = [];

    if (reduced) {
      // 150 ms crossfade, no ghosts, no FLIP.
      for (const c of cards()) anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: EASE_OUT });
      settleAfter('folded', running);
      return;
    }

    // LAST + animations
    for (const [t, f] of firstOthers) {
      const l = rel(t);
      const dx = f.x - l.x;
      const dy = f.y - l.y;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) continue;
      anim(t, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 300,
        easing: EASE_IN_OUT,
      });
    }

    let ghostCount = 0;
    for (const card of cards()) {
      const letter = card.dataset.letter;
      const leader = members.find((t) => t.dataset.letter === letter);
      const cr = rel(card);
      // Card background grows from the leader tile's rect to its own.
      if (leader) {
        const lr = firstMedia.get(leader) as Rect;
        const top = Math.max(0, lr.y - cr.y);
        const left = Math.max(0, lr.x - cr.x);
        const right = Math.max(0, cr.x + cr.w - (lr.x + lr.w));
        const bottom = Math.max(0, cr.y + cr.h - (lr.y + lr.h));
        anim(
          card,
          [
            { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 16px)` },
            { clipPath: 'inset(0px 0px 0px 0px round 16px)' },
          ],
          { duration: 320, easing: EASE_OUT_SOFT },
        );
      }

      // Everything that is text or chrome appears at 520-680 ms.
      const late = card.querySelectorAll(
        '.fold-rail, .fold-head, .fold-range, .rung > :not(.rung-bars), .fold-foot',
      );
      late.forEach((el) =>
        anim(el, [{ opacity: 0 }, { opacity: 1 }], { delay: 520, duration: 160, easing: EASE_OUT }),
      );
      card.querySelectorAll<HTMLElement>('.bar').forEach((el, i) =>
        anim(el, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
          delay: 440 + i * 30,
          duration: 200,
          easing: EASE_OUT,
        }),
      );
      // Extension lines run out from the bars to the dimension line, then the dimension line opens
      // (the extension's timings: 600 ms and 640 ms, 120 ms each).
      card.querySelectorAll('.bracket-ext').forEach((el) =>
        anim(
          el,
          [
            { transform: 'scaleX(0)', opacity: 0 },
            { transform: 'scaleX(1)', opacity: 1 },
          ],
          { delay: 600, duration: 120, easing: EASE_OUT },
        ),
      );
      card.querySelectorAll('.bracket-dim').forEach((el) =>
        anim(
          el,
          [
            { transform: 'scaleY(0)', opacity: 0 },
            { transform: 'scaleY(1)', opacity: 1 },
          ],
          { delay: 640, duration: 120, easing: EASE_OUT },
        ),
      );
      card.querySelectorAll('.tax-tag').forEach((el) =>
        anim(
          el,
          [
            { opacity: 0, transform: 'scale(0.9)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          {
            delay: 660,
            duration: 320,
            easing: SPRING_PLAYFUL,
          },
        ),
      );

      // Ghosts travel to their rung thumbnails, cheapest first (rungs are already in price order).
      const rungs = [...card.querySelectorAll<HTMLElement>('.rung')];
      rungs.forEach((rung, rank) => {
        const thumb = rung.querySelector<HTMLElement>('.rung-thumb') as HTMLElement;
        const tile = members.find((t) => t.dataset.id === rung.dataset.id);
        if (!tile || ghostCount >= MAX_GHOSTS) {
          anim(thumb, [{ opacity: 0 }, { opacity: 1 }], { delay: 520, duration: 160, easing: EASE_OUT });
          return;
        }
        ghostCount++;
        const from = firstMedia.get(tile) as Rect;
        const to = rel(thumb);
        const src =
          (tile.querySelector('img') as HTMLImageElement).currentSrc ||
          (tile.querySelector('img') as HTMLImageElement).src;
        const g = ghost(src, from);
        const s = to.w / from.w;
        const delay = 80 + rank * 40;
        anim(
          g,
          [
            { transform: 'translate(0px, 0px) scale(1)', offset: 0 },
            { transform: 'translate(0px, 0px) scale(0.94)', offset: 0.2 },
            { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${s})`, offset: 1 },
          ],
          { delay, duration: 400, easing: EASE_IN_OUT },
        );
        // The real thumbnail takes over at the instant the ghost lands (identical pixels).
        anim(thumb, [{ opacity: 0 }, { opacity: 1 }], { delay: delay + 400, duration: 1 });
        anim(g, [{ opacity: 1 }, { opacity: 0 }], { delay: delay + 400, duration: 1 });
      });
    }
    // The tiles being folded vanish at once (their ghosts stand in), so nothing flashes.
    settleAfter('folded', running);
  }

  function unfold() {
    if (phase === 'idle' || phase === 'unfolding') return;
    if (phase === 'folding') {
      // Interrupt: every running animation reverses from where it is (DESIGN: interruptible).
      phase = 'unfolding';
      const anims = running;
      for (const a of anims) a.reverse();
      settleAfter('idle', anims);
      return;
    }
    if (opts.reduced()) {
      finish('idle');
      return;
    }
    // Folded -> idle in <= 300 ms: the card fades out as a clone, ghosts fly back to their tiles.
    phase = 'unfolding';
    const allTiles = tiles();
    const members = allTiles.filter((t) => t.hasAttribute('data-twin'));
    const others = allTiles.filter((t) => !t.hasAttribute('data-twin'));
    const firstOthers = new Map(others.map((t) => [t, rel(t)]));
    const thumbs = new Map<string, { rect: Rect; src: string }>();
    const cardClones: Array<{ el: HTMLElement; r: Rect }> = [];
    for (const card of cards()) {
      cardClones.push({ el: card.cloneNode(true) as HTMLElement, r: rel(card) });
      card.querySelectorAll<HTMLElement>('.rung').forEach((rung) => {
        const thumb = rung.querySelector('.rung-thumb') as HTMLElement;
        const img = thumb.querySelector('img') as HTMLImageElement;
        if (rung.dataset.id)
          thumbs.set(rung.dataset.id, { rect: rel(thumb), src: img.currentSrc || img.src });
      });
    }
    grid.dataset.state = 'idle';
    running = [];
    for (const { el, r } of cardClones) {
      el.classList.add('card-clone');
      el.removeAttribute('aria-label');
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px` });
      ensureLayer().append(el);
      anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE_OUT });
    }
    for (const [t, f] of firstOthers) {
      const l = rel(t);
      const dx = f.x - l.x;
      const dy = f.y - l.y;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) continue;
      anim(t, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 200,
        easing: EASE_IN_OUT,
      });
    }
    let n = 0;
    for (const t of members) {
      const id = t.dataset.id as string;
      const th = thumbs.get(id);
      if (!th || n >= MAX_GHOSTS) continue;
      n++;
      const to = rel(media(t));
      const g = ghost(th.src, th.rect);
      t.classList.add('is-returning');
      const s = to.w / th.rect.w;
      anim(
        g,
        [
          { transform: 'translate(0px, 0px) scale(1)' },
          { transform: `translate(${to.x - th.rect.x}px, ${to.y - th.rect.y}px) scale(${s})` },
        ],
        { duration: 240, easing: EASE_IN_OUT },
      );
    }
    settleAfter('idle', running);
  }

  return {
    get phase() {
      return phase;
    },
    fold,
    unfold,
    settle() {
      if (phase === 'folding') finish('folded');
      else if (phase === 'unfolding') finish('idle');
    },
    destroy() {
      cleanup();
      layer?.remove();
    },
  };
}
