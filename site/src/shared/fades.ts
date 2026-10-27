// Edge fades on the sideways-scrolling price ladders (the extension's useEdgeFades, for plain DOM):
// `data-fade="start end"` marks which edges hide rungs, and stage.css masks only those edges. Written
// straight to the element so scrolling never re-renders anything.

function update(el: HTMLElement) {
  const max = el.scrollWidth - el.clientWidth;
  const edges = [el.scrollLeft > 1 ? 'start' : '', el.scrollLeft < max - 1 ? 'end' : '']
    .filter(Boolean)
    .join(' ');
  if (edges) el.setAttribute('data-fade', edges);
  else el.removeAttribute('data-fade');
}

export interface EdgeFades {
  refresh(): void;
  destroy(): void;
}

/** Watches every `.ladder-scroll` inside `root`, including ones rendered later. */
export function edgeFades(root: HTMLElement): EdgeFades {
  const refresh = () => root.querySelectorAll<HTMLElement>('.ladder-scroll').forEach(update);
  // Scroll does not bubble, but it can be captured, so one listener covers re-rendered cards too.
  const onScroll = (e: Event) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.classList.contains('ladder-scroll')) update(t);
  };
  root.addEventListener('scroll', onScroll, { capture: true, passive: true });
  // Folding, unfolding and viewport changes all resize the root.
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
  ro?.observe(root);
  refresh();
  return {
    refresh,
    destroy() {
      root.removeEventListener('scroll', onScroll, { capture: true });
      ro?.disconnect();
    },
  };
}
