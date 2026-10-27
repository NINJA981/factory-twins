import '../styles/base.css';
import '../styles/stage.css';
import './landing.css';
import type { ClusterResult, Listing } from '@engine';
import demo from '../demo/demo.json';
import { $, $$, esc, prefersReducedMotion } from '../shared/dom';
import { icon } from '../shared/icons';
import { measurePair } from '../shared/measure';
import { mountStage } from '../shared/stage';
import { markerPath } from './marker';

const reduced = prefersReducedMotion();

// ---- Hero demo: the real overlay state machines running on the pre-rendered grid -------------------
const demoEl = $('#demo');
if (demoEl) {
  const grid = $('.grid', demoEl) as HTMLElement;
  // Boot: the static HTML is the folded end state (what JS-off visitors get). With motion allowed the
  // head script already made it look unfolded; make the attributes agree before the stage mounts.
  if (!reduced) {
    delete grid.dataset.boot;
    grid.dataset.state = 'idle';
    document.documentElement.classList.remove('demo-idle');
  }
  const stage = mountStage({
    root: demoEl,
    data: { listings: demo.listings as Listing[], result: demo.result as unknown as ClusterResult },
    measure: measurePair,
    hydrate: true,
    keyboard: true,
    pill: { kind: 'result', summary: (demo.result as unknown as ClusterResult).summary },
  });
  const foldBtn = $<HTMLButtonElement>('[data-demo="fold"]');
  const label = $('[data-demo-label]');
  const refreshLabel = () => {
    if (!label) return;
    label.textContent = stage.state.folded ? (reduced ? 'Replay fold' : 'Unfold twins') : 'Fold twins';
  };
  stage.onChange(refreshLabel);
  refreshLabel();
  foldBtn?.addEventListener('click', () => {
    if (reduced && stage.state.folded) {
      // Replay: unfold instantly, then fold again with the 150 ms crossfade.
      stage.dispatch({ type: 'toggle-fold' });
      requestAnimationFrame(() => stage.dispatch({ type: 'toggle-fold' }));
    } else stage.dispatch({ type: 'toggle-fold' });
  });
  $('[data-demo="lens"]')?.addEventListener('click', (e) =>
    stage.dispatch({ type: 'open-lens' }, e.currentTarget as HTMLElement),
  );

  // Marker circle, once, after the H1 has painted. Static under reduced motion (and hidden: folded).
  const svg = $<SVGSVGElement>('.marker', demoEl);
  const path = svg?.querySelector('path');
  const draw = (animate: boolean) => {
    if (!svg || !path) return;
    const tiles = $$('.tile[data-twin]', grid);
    const r = grid.getBoundingClientRect();
    if (r.width === 0 || tiles.length === 0 || grid.dataset.state === 'folded') return;
    const stageRect = demoEl.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
    path.setAttribute('d', markerPath(tiles, demoEl));
    path.setAttribute('pathLength', '1');
    if (animate && !reduced) {
      path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration: 700,
        easing: 'cubic-bezier(0.65, 0.05, 0, 1)',
        fill: 'both',
      });
      (path as SVGPathElement).style.strokeDasharray = '1';
    } else (path as SVGPathElement).style.strokeDasharray = 'none';
  };
  let drawn = false;
  const start = () => {
    if (drawn) return;
    drawn = true;
    draw(true);
  };
  // After the H1 and the images have painted; never competes with the LCP.
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback;
  const kick = () => (idle ? idle(start, { timeout: 1500 }) : setTimeout(start, 600));
  if (document.readyState === 'complete') kick();
  else addEventListener('load', kick, { once: true });
  new ResizeObserver(() => {
    if (!drawn) return;
    const p = path as SVGPathElement;
    p.getAnimations().forEach((a) => a.cancel());
    p.style.strokeDasharray = 'none';
    draw(false);
  }).observe(grid);
  stage.onChange((next, prev) => {
    if (prev.folded && !next.folded && drawn) setTimeout(() => draw(false), 340);
  });
}

// ---- Proof stack (cards in space, CSS only) ---------------------------------------------------------
const block = $('#proof .block');
const stackEl = $('.stack');
if (block && stackEl) {
  const cards = $$('.stack-card', stackEl);
  const lastTwin = cards.length - 2;
  const btnStack = $<HTMLButtonElement>('[data-stack="stack"]');
  const btnDiff = $<HTMLButtonElement>('[data-stack="different"]');
  const readTwin = $('#readout-twin');
  const readDiff = $('#readout-different');
  let mode: 'twins' | 'different' = 'twins';
  let stacked = false;
  let timer = 0;

  function layout() {
    stackEl!.dataset.mode = mode;
    cards.forEach((c, i) => {
      const isOther = c.classList.contains('stack-other');
      const top = mode === 'twins' ? i === lastTwin : isOther;
      const role = i === 0 ? 'low' : top ? 'top' : 'mid';
      c.dataset.role = role;
      c.style.setProperty('--i', String(mode === 'different' && isOther ? 1 : i));
    });
    if (readTwin) readTwin.hidden = mode !== 'twins';
    if (readDiff) readDiff.hidden = mode !== 'different';
  }
  function apply() {
    clearTimeout(timer);
    delete stackEl!.dataset.settled;
    stackEl!.dataset.state = stacked ? 'stacked' : 'fan';
    (block as HTMLElement).dataset.stacked = String(stacked);
    if (btnStack) {
      btnStack.setAttribute('aria-pressed', String(stacked));
      btnStack.textContent = stacked ? 'Fan them out' : 'Stack them';
    }
    btnDiff?.setAttribute('aria-pressed', String(mode === 'different'));
    if (btnDiff) btnDiff.textContent = mode === 'different' ? 'Back to the twins' : 'Try two different photos';
    // Once the cards have met, flatten so the blend sees only the card below.
    if (stacked) timer = window.setTimeout(() => (stackEl!.dataset.settled = ''), reduced ? 160 : 800);
  }
  layout();
  apply();
  btnStack?.addEventListener('click', () => {
    stacked = !stacked;
    apply();
  });
  btnDiff?.addEventListener('click', () => {
    mode = mode === 'twins' ? 'different' : 'twins';
    stacked = true;
    layout();
    apply();
  });
  // Once, when the beat scrolls into view.
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          setTimeout(() => {
            if (!stacked) {
              stacked = true;
              apply();
            }
          }, 500);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(stackEl);
  }
}

// ---- Recorded loop: lazy, muted, with a visible pause control -------------------------------------
const loop = $('[data-loop]');
if (loop) {
  const video = $<HTMLVideoElement>('video', loop);
  const toggle = $<HTMLButtonElement>('[data-loop-toggle]', loop);
  if (video && toggle) {
    toggle.addEventListener('click', () => {
      if (video.paused) {
        video.preload = 'auto';
        void video.play();
      } else video.pause();
    });
    const sync = () => {
      toggle.textContent = video.paused ? 'Play the recording' : 'Pause the recording';
      toggle.setAttribute('aria-pressed', String(!video.paused));
    };
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('error', () => {
      // The recording is optional: without it the poster stays and the button explains itself.
      toggle.hidden = true;
    });
  }
}

// ---- Sticky nav hairline ----------------------------------------------------------------------------
const nav = $('[data-nav]');
if (nav) {
  const onScroll = () => (nav.dataset.scrolled = String(scrollY > 8));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---- Copy buttons -------------------------------------------------------------------------------------
const status = $('[data-copy-status]');
$$('[data-copy]').forEach((btn) => {
  btn.innerHTML = icon('copy', 18);
  btn.addEventListener('click', async () => {
    const target = $(btn.dataset.copy as string);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent ?? '');
      btn.innerHTML = icon('check', 18);
      btn.dataset.copied = 'true';
      if (status) status.textContent = 'Copied.';
      setTimeout(() => {
        btn.innerHTML = icon('copy', 18);
        delete btn.dataset.copied;
      }, 1800);
    } catch {
      if (status) status.textContent = "Couldn't copy. Select the text and press Ctrl+C.";
    }
  });
});

// ---- Privacy proof: what did this page actually request? -------------------------------------------
const net = $('[data-net]');
if (net && 'performance' in window) {
  const body = $('[data-net-body]', net) as HTMLElement;
  const iconEl = $('[data-net-icon]', net) as HTMLElement;
  const report = () => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const hosts = new Map<string, number>();
    for (const e of entries) {
      try {
        const h = new URL(e.name).host;
        hosts.set(h, (hosts.get(h) ?? 0) + 1);
      } catch {
        /* ignore */
      }
    }
    const total = entries.length + 1; // plus this document
    const others = [...hosts].filter(([h]) => h !== location.host);
    if (others.length === 0) {
      iconEl.innerHTML = icon('shield', 16);
      body.textContent = `This page made ${total} requests, all to ${location.host}, and 0 to anyone else. That count comes from your browser, not from us.`;
    } else {
      iconEl.innerHTML = icon('alert', 16);
      body.innerHTML = `This page made requests to other hosts: ${others.map(([h, n]) => `${esc(h)} (${n})`).join(', ')}.`;
    }
  };
  if (document.readyState === 'complete') report();
  else addEventListener('load', () => setTimeout(report, 300), { once: true });
}
