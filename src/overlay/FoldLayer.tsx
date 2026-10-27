import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { StoreAdapter } from '../adapters/types';
import { UNFOLDED, foldAnnouncement, foldDetail } from '../copy/strings';
import type { TwinGroup, Listing } from '../core/types';
import { foldCardView, type FoldCardView } from '../core/view/groupView';
import cardCss from '../styles/card.css?inline';
import { FoldCard } from './FoldCard';
import {
  playCrossfade,
  playFold,
  playUnfold,
  type Box,
  type FoldCardPlan,
  type GhostSpec,
  type Handle,
} from './foldMotion';
import { canAnimate } from './motion';
import type { Scheme } from './pageScheme';

// Folding twin groups into cards (SPEC F6). This component owns every change it makes to the store's
// grid: hosts inserted, tiles hidden. Each is recorded so unfold puts the grid back exactly
// (AC-F6.7). The choreography itself lives in foldMotion.ts.

export const CARD_HOST_TAG = 'factory-twins-card';

interface Entry {
  letter: string;
  host: HTMLElement;
  mount: HTMLElement;
  /** Member tiles on this page, in page order, and the inline style each had before we hid it. */
  tiles: Array<{ el: HTMLElement; style: string | null }>;
  view: FoldCardView;
}

const box = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });

function photoBox(tile: Element): { box: Box; src: string } {
  const img = tile.querySelector('img');
  const r = (img ?? tile).getBoundingClientRect();
  return { box: box(r), src: img?.currentSrc || img?.src || '' };
}

function hideTile(t: Entry['tiles'][number]): void {
  t.el.style.setProperty('display', 'none', 'important');
}

function restoreTile(t: Entry['tiles'][number]): void {
  if (t.style == null) t.el.removeAttribute('style');
  else t.el.setAttribute('style', t.style);
}

function restoreEntry(e: Entry): void {
  e.host.remove();
  for (const t of e.tiles) restoreTile(t);
}

function inDocumentOrder(a: Element, b: Element): number {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function createEntry(
  adapter: StoreAdapter,
  group: TwinGroup,
  view: FoldCardView,
  tiles: Element[],
  theme: Scheme,
): Entry | null {
  const sorted = [...tiles].sort(inDocumentOrder);
  const leader = sorted[0];
  if (!leader) return null;
  const insertion = adapter.foldInsertion(leader);
  if (!insertion) return null;
  const doc = leader.ownerDocument;
  const host = doc.createElement(CARD_HOST_TAG);
  host.setAttribute('data-theme', theme);
  Object.assign(host.style, { display: 'block', minWidth: '0', boxSizing: 'border-box', margin: '8px 0' });
  Object.assign(host.style, insertion.rowStyle);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = cardCss;
  const mount = doc.createElement('div');
  shadow.append(style, mount);
  insertion.parent.insertBefore(host, insertion.before);
  const hidden = sorted.map((el) => ({ el: el as HTMLElement, style: el.getAttribute('style') }));
  for (const t of hidden) hideTile(t);
  return { letter: group.letter, host, mount, tiles: hidden, view };
}

/** If the first group is not comfortably on screen, bring it into view first, so the fold is seen, not just heard. */
function revealFirstGroup(p: FoldLayerProps): void {
  let first: Element | null = null;
  for (const g of p.groups)
    for (const id of g.memberIds) {
      const t = p.tilesById.get(id);
      if (t?.isConnected && (!first || inDocumentOrder(t, first) < 0)) first = t;
    }
  const view = first?.ownerDocument.defaultView;
  if (!first || !view) return;
  const r = first.getBoundingClientRect();
  // Off screen, or low enough that the card (about 400 px tall) would run under the pill: bring its top
  // to a comfortable spot first, so the fold is seen, not just heard.
  if (r.bottom < 0 || r.top > view.innerHeight * 0.35)
    view.scrollTo({ top: view.scrollY + r.top - 96, behavior: 'instant' });
}

interface Running {
  kind: 'fold' | 'unfold';
  handle: Handle;
  reversed: boolean;
}

export interface FoldLayerProps {
  adapter: StoreAdapter;
  folded: boolean;
  groups: readonly TwinGroup[];
  listings: Readonly<Record<string, Listing>>;
  tilesById: ReadonlyMap<string, Element>;
  page: number;
  theme: Scheme;
  reduced: boolean;
  ghostLayer: RefObject<HTMLElement | null>;
  /** True when the pointer started this fold, so focus is not stolen from the mouse user. */
  pointerRef: RefObject<boolean>;
  onUnfold(): void;
  onCheckPixels(letter: string): void;
  onFocusGroup(letter: string | null): void;
  onAnnounce(text: string): void;
}

export function FoldLayer(props: FoldLayerProps) {
  const entries = useRef(new Map<string, Entry>());
  const running = useRef<Running | null>(null);
  const pending = useRef<null | (() => void)>(null);
  const [cards, setCards] = useState<Entry[]>([]);
  const latest = useRef(props);
  // Declared before the reconcile effect below, so it always sees the newest props.
  useLayoutEffect(() => {
    latest.current = props;
  });

  const publish = () => setCards([...entries.current.values()]);

  const clearAll = () => {
    for (const e of entries.current.values()) restoreEntry(e);
    entries.current.clear();
    running.current = null;
    setCards([]);
  };

  /** Hosts and tiles for the groups that can fold right now. Returns the entries just created. */
  const syncEntries = (): Entry[] => {
    const p = latest.current;
    const created: Entry[] = [];
    const seen = new Set<string>();
    for (const g of p.groups) {
      const view = foldCardView(g, p.listings, p.page);
      const tiles = g.memberIds
        .map((id) => p.tilesById.get(id))
        .filter((t): t is Element => t != null && t.isConnected);
      if (!view || tiles.length === 0) continue;
      seen.add(g.letter);
      const existing = entries.current.get(g.letter);
      if (existing) {
        existing.view = view;
        // New members that arrived with a lazy load get hidden too.
        for (const t of tiles) {
          if (!existing.tiles.some((x) => x.el === t)) {
            const rec = { el: t as HTMLElement, style: t.getAttribute('style') };
            existing.tiles.push(rec);
            hideTile(rec);
          }
        }
        continue;
      }
      const entry = createEntry(p.adapter, g, view, tiles, p.theme);
      if (entry) {
        entries.current.set(g.letter, entry);
        created.push(entry);
      }
    }
    for (const [letter, e] of [...entries.current]) {
      if (!seen.has(letter)) {
        restoreEntry(e);
        entries.current.delete(letter);
      }
    }
    return created;
  };

  const settleFold = () => {
    const r = running.current;
    r?.handle.dispose();
    running.current = null;
    const p = latest.current;
    const list = [...entries.current.values()];
    const first = list[0];
    if (!first) return;
    const detail = (e: Entry) => {
      const prices = e.view.rungs.map((x) => x.comparable).filter((v): v is number => v != null);
      return foldDetail(
        e.letter,
        e.view.memberCount,
        prices.length ? Math.min(...prices) : null,
        prices.length ? Math.max(...prices) : null,
      );
    };
    p.onAnnounce(`${foldAnnouncement(list.length)} ${detail(first)}`);
    if (!p.pointerRef.current) first.mount.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    p.pointerRef.current = false;
  };

  const startFold = (
    created: Entry[],
    before: { tiles: Map<Element, Box>; ghosts: Map<string, { box: Box; src: string }> },
  ) => {
    const p = latest.current;
    const layer = p.ghostLayer.current;
    const first = created[0];
    const animate = !p.reduced && layer != null && first != null && canAnimate(first.host);
    if (!animate || !layer) {
      if (!p.reduced || !first || !canAnimate(first.host)) {
        settleFold();
        return;
      }
      const h = playCrossfade(
        created.map((c) => c.host),
        'in',
      );
      running.current = { kind: 'fold', handle: h, reversed: false };
      void h.finished().then(() => {
        if (running.current?.handle === h && !running.current.reversed) settleFold();
        else if (running.current?.handle === h) clearAll();
      });
      return;
    }
    const plans: FoldCardPlan[] = created.map((e) => {
      const cardBox = box(e.host.getBoundingClientRect());
      const leader = e.tiles[0];
      const leaderBox = leader ? (before.tiles.get(leader.el) ?? null) : null;
      const ranked = e.view.rungs;
      const ghosts: GhostSpec[] = [];
      ranked.forEach((r, rank) => {
        const g = before.ghosts.get(r.id);
        const thumb = e.mount.querySelector<HTMLElement>(`[data-a="thumb"][data-id="${CSS.escape(r.id)}"]`);
        if (!g || !thumb || !g.src) return;
        ghosts.push({ src: g.src, box: g.box, to: box(thumb.getBoundingClientRect()), rank, thumb });
      });
      return { root: e.mount, cardBox, leaderBox, ghosts };
    });
    // Tiles that reflow because members left and the card arrived (FLIP).
    const flips = [] as Array<{ el: HTMLElement; dx: number; dy: number }>;
    for (const [el, old] of before.tiles) {
      if (!el.isConnected || (el as HTMLElement).style.display === 'none') continue;
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) flips.push({ el: el as HTMLElement, dx, dy });
    }
    const handle = playFold({ layer, cards: plans, flips });
    running.current = { kind: 'fold', handle, reversed: false };
    void handle.finished().then(() => {
      const r = running.current;
      if (r?.handle !== handle) return;
      if (r.reversed) clearAll();
      else settleFold();
    });
  };

  const startUnfold = () => {
    const p = latest.current;
    const list = [...entries.current.values()];
    if (list.length === 0) return;
    const layer = p.ghostLayer.current;
    const head = list[0];
    const animate = !p.reduced && layer != null && head != null && canAnimate(head.host);
    if (!animate || !layer) {
      if (p.reduced && head && canAnimate(head.host)) {
        const h = playCrossfade(
          list.map((e) => e.host),
          'out',
        );
        running.current = { kind: 'unfold', handle: h, reversed: false };
        void h.finished().then(() => {
          if (running.current?.handle === h) clearAll();
        });
      } else {
        clearAll();
      }
      p.onAnnounce(UNFOLDED);
      return;
    }
    // Measure the card, then pull it out of the flow as a fading copy while the grid takes its tiles back.
    const others = new Map<Element, Box>();
    for (const el of p.tilesById.values()) {
      if (el.isConnected && !list.some((e) => e.tiles.some((t) => t.el === el)))
        others.set(el, box(el.getBoundingClientRect()));
    }
    const ghostPlans: Array<{ host: HTMLElement; ghosts: GhostSpec[] }> = [];
    for (const e of list) {
      const hostRect = e.host.getBoundingClientRect();
      Object.assign(e.host.style, {
        position: 'fixed',
        left: `${hostRect.left}px`,
        top: `${hostRect.top}px`,
        width: `${hostRect.width}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: '2147483000',
      });
      ghostPlans.push({ host: e.host, ghosts: [] });
    }
    // Give the tiles back (invisible for now) so the grid reflows and we can read where they land.
    for (const e of list) {
      for (const t of e.tiles) {
        restoreTile(t);
        t.el.style.setProperty('visibility', 'hidden', 'important');
      }
    }
    list.forEach((e, i) => {
      const plan = ghostPlans[i];
      if (!plan) return;
      e.view.rungs.forEach((r, rank) => {
        const tile = p.tilesById.get(r.id);
        const th = e.mount.querySelector<HTMLElement>(`[data-a="thumb"][data-id="${CSS.escape(r.id)}"]`);
        if (!tile || !th || !tile.isConnected) return;
        const tp = photoBox(tile);
        plan.ghosts.push({
          src: tp.src || r.imageUrl,
          box: tp.box,
          to: box(th.getBoundingClientRect()),
          rank,
          thumb: null,
        });
      });
    });
    const flips = [] as Array<{ el: HTMLElement; dx: number; dy: number }>;
    for (const [el, old] of others) {
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) flips.push({ el: el as HTMLElement, dx, dy });
    }
    const handle = playUnfold({ layer, cards: ghostPlans, flips });
    running.current = { kind: 'unfold', handle, reversed: false };
    p.onAnnounce(UNFOLDED);
    void handle.finished().then(() => {
      if (running.current?.handle !== handle) return;
      handle.dispose();
      clearAll();
    });
  };

  // Reconcile with the overlay state.
  useLayoutEffect(() => {
    const p = latest.current;
    const r = running.current;
    if (p.folded) {
      if (r?.kind === 'unfold') {
        r.handle.finish();
        clearAll();
      } else if (r?.kind === 'fold' && r.reversed) {
        // Folded again while the fold was running backwards: turn it around.
        r.handle.reverse();
        r.reversed = false;
        return;
      } else if (r?.kind === 'fold') {
        syncEntries();
        publish();
        return;
      }
      const fresh = entries.current.size === 0;
      if (fresh) revealFirstGroup(p);
      // Positions before anything moves.
      const before = { tiles: new Map<Element, Box>(), ghosts: new Map<string, { box: Box; src: string }>() };
      if (fresh) {
        for (const el of p.tilesById.values())
          if (el.isConnected) before.tiles.set(el, box(el.getBoundingClientRect()));
        for (const g of p.groups)
          for (const id of g.memberIds) {
            const tile = p.tilesById.get(id);
            if (tile?.isConnected) before.ghosts.set(id, photoBox(tile));
          }
      }
      const created = syncEntries();
      publish();
      if (fresh && created.length > 0) pending.current = () => startFold(created, before);
      else if (!fresh) return;
      else if (created.length === 0) return;
    } else if (entries.current.size > 0) {
      if (r?.kind === 'fold' && !r.reversed) {
        r.handle.reverse();
        r.reversed = true;
        return;
      }
      if (r?.kind === 'unfold') return;
      startUnfold();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.folded, props.groups, props.tilesById, props.listings, props.page]);

  // Runs after React has rendered the cards into their shadow roots: now they can be measured.
  useLayoutEffect(() => {
    const run = pending.current;
    pending.current = null;
    run?.();
  }, [cards]);

  useEffect(
    () => () => {
      running.current?.handle.dispose();
      clearAll();
    },
    [],
  );

  const gone = new Set<string>();
  for (const e of cards)
    for (const r of e.view.rungs) {
      const tile = props.tilesById.get(r.id);
      if (r.otherPage == null && (!tile || !tile.isConnected)) gone.add(r.id);
    }

  return (
    <>
      {cards.map((e) =>
        createPortal(
          <FoldCard
            view={e.view}
            goneIds={gone}
            onCheckPixels={() => props.onCheckPixels(e.letter)}
            onUnfold={() => {
              props.pointerRef.current = true;
              props.onUnfold();
            }}
            onFocusGroup={() => props.onFocusGroup(e.letter)}
          />,
          e.mount,
          e.letter,
        ),
      )}
    </>
  );
}
