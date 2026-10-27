import { EASE } from './motion';

// The signature moment, frame by frame (DESIGN.md, "Signature moment: Fold twins"), written with
// the Web Animations API so it can be reversed from wherever it is. Only transform, opacity and
// clip-path animate. This module touches the DOM it is handed and nothing else.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GhostSpec {
  src: string;
  /** Where the store's own photo sits now (viewport coordinates). */
  box: Box;
  /** The rung thumbnail it travels to. Filled in once the card has laid out. */
  to: Box;
  /** Price rank within its group: cheapest first, 40 ms stagger. */
  rank: number;
  thumb: HTMLElement | null;
}

export interface FoldCardPlan {
  /** The card's shadow-root mount, to find the parts to animate. */
  root: ParentNode;
  cardBox: Box;
  /** The leader tile's box before the fold; the card surface grows from it. */
  leaderBox: Box | null;
  ghosts: GhostSpec[];
}

export interface Flip {
  el: HTMLElement;
  dx: number;
  dy: number;
}

export interface FoldInput {
  layer: HTMLElement;
  cards: FoldCardPlan[];
  flips: Flip[];
}

export interface Handle {
  readonly animations: Animation[];
  /** Resolves when every animation has finished in its current direction. */
  finished(): Promise<void>;
  reverse(): void;
  /** Jumps to the end state and clears everything this module added. */
  finish(): void;
  /** Removes ghosts and cancels animations (the DOM then shows the natural end state). */
  dispose(): void;
}

export const MAX_GHOSTS = 12;

const q = <T extends Element>(root: ParentNode, sel: string): T[] => [...root.querySelectorAll<T>(sel)];

function center(b: Box) {
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

function insetFor(inner: Box, outer: Box, radius: number): string {
  const top = Math.max(0, inner.top - outer.top);
  const left = Math.max(0, inner.left - outer.left);
  const right = Math.max(0, outer.left + outer.width - (inner.left + inner.width));
  const bottom = Math.max(0, outer.top + outer.height - (inner.top + inner.height));
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;
}

function makeGhost(layer: HTMLElement, spec: GhostSpec): { outer: HTMLElement; img: HTMLElement } {
  const doc = layer.ownerDocument;
  const outer = doc.createElement('div');
  outer.className = 'ft-ghost';
  Object.assign(outer.style, {
    left: `${spec.box.left}px`,
    top: `${spec.box.top}px`,
    width: `${spec.box.width}px`,
    height: `${spec.box.height}px`,
    transformOrigin: '50% 50%',
  });
  const img = doc.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.src = spec.src;
  outer.append(img);
  layer.append(outer);
  return { outer, img };
}

function travel(spec: GhostSpec): { dx: number; dy: number; scale: number } {
  const a = center(spec.box);
  const b = center(spec.to);
  const scale = Math.min(
    spec.to.width / Math.max(1, spec.box.width),
    spec.to.height / Math.max(1, spec.box.height),
  );
  return { dx: b.x - a.x, dy: b.y - a.y, scale };
}

function handleFor(animations: Animation[], cleanup: () => void): Handle {
  let disposed = false;
  const all = () =>
    Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
  return {
    animations,
    finished: all,
    reverse() {
      for (const a of animations) a.reverse();
    },
    finish() {
      for (const a of animations) {
        try {
          a.finish();
        } catch {
          /* an animation that cannot finish is already gone */
        }
      }
      this.dispose();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const a of animations) a.cancel();
      cleanup();
    },
  };
}

/** Fold: ghosts fly into the ladder, the card grows from the leader tile, the grid reflows. */
export function playFold(input: FoldInput): Handle {
  const animations: Animation[] = [];
  const ghostNodes: HTMLElement[] = [];
  const add = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, { fill: 'both', ...options });
    animations.push(a);
    return a;
  };

  for (const f of input.flips) {
    add(f.el, [{ transform: `translate(${f.dx}px, ${f.dy}px)` }, { transform: 'translate(0, 0)' }], {
      duration: 300,
      easing: EASE.inOut,
    });
  }

  for (const card of input.cards) {
    const surface = q<HTMLElement>(card.root, '[data-a="surface"]')[0];
    if (surface && card.leaderBox) {
      add(
        surface,
        [
          { clipPath: insetFor(card.leaderBox, card.cardBox, 12) },
          { clipPath: 'inset(0px 0px 0px 0px round 16px)' },
        ],
        { duration: 320, easing: EASE.outSoft },
      );
    }
    // Card parts that wait for the photos to land.
    const fades = q<HTMLElement>(card.root, '[data-a="fade"]');
    for (const el of fades)
      add(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 520, easing: EASE.out });

    q<HTMLElement>(card.root, '[data-a="bar"]').forEach((bar, i) =>
      add(bar, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
        duration: 200,
        delay: 440 + 30 * i,
        easing: EASE.out,
      }),
    );
    for (const el of q<HTMLElement>(card.root, '[data-a="bracket"]'))
      add(
        el,
        [
          { transform: 'scaleY(0)', opacity: 0 },
          { transform: 'scaleY(1)', opacity: 1 },
        ],
        {
          duration: 120,
          delay: 640,
          easing: EASE.out,
        },
      );
    for (const el of q<HTMLElement>(card.root, '[data-a="tag"]'))
      add(
        el,
        [
          { opacity: 0, transform: 'scale(0.9)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: 320,
          delay: 660,
          easing: EASE.springPlayful,
        },
      );

    for (const spec of card.ghosts.slice(0, MAX_GHOSTS)) {
      const { outer, img } = makeGhost(input.layer, spec);
      ghostNodes.push(outer);
      const t = travel(spec);
      const delay = 80 + 40 * spec.rank;
      add(
        img,
        [
          { transform: 'scale(1)', boxShadow: 'none' },
          { transform: 'scale(0.94)', boxShadow: 'var(--elev-e2)' },
        ],
        {
          duration: 120,
          easing: EASE.out,
        },
      );
      add(
        outer,
        [
          { transform: 'translate(0px, 0px) scale(1)' },
          { transform: `translate(${t.dx}px, ${t.dy}px) scale(${t.scale})` },
        ],
        { duration: 400, delay, easing: EASE.inOut },
      );
      // The real thumbnail stays invisible until its ghost lands; the swap is pixel-identical.
      if (spec.thumb) {
        const end = delay + 400;
        add(
          spec.thumb,
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: end / (end + 16) },
            { opacity: 1, offset: 1 },
          ],
          { duration: end + 16, easing: 'linear' },
        );
      }
    }
  }

  return handleFor(animations, () => {
    for (const n of ghostNodes) n.remove();
  });
}

export interface UnfoldCardPlan {
  host: HTMLElement;
  ghosts: GhostSpec[];
}

export interface UnfoldInput {
  layer: HTMLElement;
  cards: UnfoldCardPlan[];
  flips: Flip[];
}

/** Unfold: fast and without stagger. Card fades, ghosts return, tiles reflow. */
export function playUnfold(input: UnfoldInput): Handle {
  const animations: Animation[] = [];
  const ghostNodes: HTMLElement[] = [];
  const add = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, { fill: 'both', ...options });
    animations.push(a);
    return a;
  };
  for (const f of input.flips) {
    add(f.el, [{ transform: `translate(${f.dx}px, ${f.dy}px)` }, { transform: 'translate(0, 0)' }], {
      duration: 200,
      easing: EASE.inOut,
    });
  }
  for (const card of input.cards) {
    add(card.host, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE.out });
    for (const spec of card.ghosts.slice(0, MAX_GHOSTS)) {
      // Here `box` is the tile's photo (where the ghost ends) and `to` the rung thumbnail (where it starts).
      const { outer } = makeGhost(input.layer, spec);
      ghostNodes.push(outer);
      const t = travel(spec);
      add(
        outer,
        [
          { transform: `translate(${t.dx}px, ${t.dy}px) scale(${t.scale})` },
          { transform: 'translate(0px, 0px) scale(1)' },
        ],
        { duration: 240, easing: EASE.inOut },
      );
    }
  }
  return handleFor(animations, () => {
    for (const n of ghostNodes) n.remove();
  });
}

/** Reduced motion (DESIGN.md): no ghosts, no flip, a 150 ms crossfade. */
export function playCrossfade(hosts: HTMLElement[], direction: 'in' | 'out'): Handle {
  const animations = hosts.map((h) =>
    h.animate(direction === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
      duration: 150,
      easing: 'linear',
      fill: 'both',
    }),
  );
  return handleFor(animations, () => undefined);
}
