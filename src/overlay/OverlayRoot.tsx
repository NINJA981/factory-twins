import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { badgeLabel, sameAsOthers, seenAcrossPages, variantsChip, CHECK_PIXELS } from '../copy/strings';
import type { Controller } from '../content/controller';
import { badgeViews, foldCardView } from '../core/view/groupView';
import type { LensState } from '../core/state/overlay';
import { pillVisible } from '../core/state/pill';
import { Cheatsheet } from './Cheatsheet';
import { FoldLayer } from './FoldLayer';
import { useReducedMotion } from './motion';
import { samplePageScheme, type Scheme } from './pageScheme';
import { Pill, usePillDisplay } from './Pill';
import { ProofLens } from './ProofLens';
import { TileLayer, type TileDecor } from './TileLayer';

// Everything the shopper sees on the store page, driven by controller.getState().

const LENS_EXIT_MS = 160;

function usePageScheme(doc: Document, resampleOn: unknown): Scheme {
  const [scheme, setScheme] = useState<Scheme>(() => samplePageScheme(doc));
  useEffect(() => {
    const resample = () => setScheme(samplePageScheme(doc));
    resample();
    const mq = doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener('change', resample);
    return () => mq?.removeEventListener('change', resample);
  }, [doc, resampleOn]);
  return scheme;
}

/** Keeps the lens mounted for its exit animation after the state has already closed it. */
function useLensPresence(lens: LensState | null, reduced: boolean) {
  const [shown, setShown] = useState<LensState | null>(lens);
  // Render-phase update: the newest open lens always wins, with no extra pass through an effect.
  if (lens && lens !== shown) setShown(lens);
  useEffect(() => {
    if (lens) return;
    const t = setTimeout(() => setShown(null), reduced ? 0 : LENS_EXIT_MS);
    return () => clearTimeout(t);
  }, [lens, reduced]);
  return { shown: lens ?? (reduced ? null : shown), leaving: !lens && !reduced && shown != null };
}

export function OverlayRoot({
  controller,
  reportUrl,
  host,
}: {
  controller: Controller;
  reportUrl: string;
  host: HTMLElement;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const doc = host.ownerDocument;
  const reduced = useReducedMotion();
  const theme = usePageScheme(doc, state.result);
  useEffect(() => {
    host.setAttribute('data-theme', theme);
  }, [host, theme]);

  const pill = usePillDisplay(state.pill);
  const { overlay, result, session, page, tilesById } = state;
  const groups = useMemo(() => result?.groups ?? [], [result]);
  const listings = useMemo(() => session?.listings ?? {}, [session]);
  const corner = useMemo(() => controller.adapter.pillPlacement(doc).corner, [controller, doc]);

  // Letter whose members are outlined while a badge has hover or focus.
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const activate = useCallback(
    (letter: string | null) => {
      setActiveLetter(letter);
      if (letter) controller.dispatch({ type: 'focus-group', letter });
    },
    [controller],
  );
  const openLens = useCallback(
    (letter: string) => controller.dispatch({ type: 'open-lens', letter }),
    [controller],
  );

  // Whether the pointer (not a key) started the last ring or fold, so motion and focus fit the input.
  const pointerFold = useRef(false);
  const [slotInstant, setSlotInstant] = useState(true);
  const [ringsSeen, setRingsSeen] = useState(overlay.rings);
  if (ringsSeen !== overlay.rings) {
    setRingsSeen(overlay.rings);
    if (!overlay.rings) setSlotInstant(true);
  }

  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback((text: string) => setAnnouncement(text), []);

  const decor = useMemo(() => {
    const out = new Map<string, TileDecor>();
    if (!overlay.rings || !result) return out;
    const views = badgeViews(groups, listings, page);
    for (const [id, v] of views) {
      out.set(id, {
        kind: 'twin',
        letter: v.letter,
        label: badgeLabel(v.letter, v.members),
        tip: v.pages > 1 ? seenAcrossPages(v.members, v.pages) : sameAsOthers(v.othersOnPage),
      });
    }
    for (const fam of result.variantFamilies) {
      for (const id of fam.memberIds)
        if (!out.has(id)) out.set(id, { kind: 'variants', label: variantsChip(fam.memberIds.length) });
    }
    return out;
  }, [overlay.rings, result, groups, listings, page]);

  const ghostLayer = useRef<HTMLDivElement>(null);
  const lens = useLensPresence(overlay.lens, reduced);
  const lensGroup = lens.shown ? groups.find((g) => g.letter === lens.shown?.letter) : undefined;
  const lensView = lensGroup ? foldCardView(lensGroup, listings, page) : null;
  const measure = useCallback((a: string, b: string) => controller.measure(a, b), [controller]);

  return (
    <div className="ft-root ft-ui">
      <TileLayer
        tiles={tilesById}
        decor={decor}
        theme={theme}
        activeLetter={activeLetter}
        hint={CHECK_PIXELS}
        onActivate={activate}
        onOpenLens={openLens}
      />
      <FoldLayer
        adapter={controller.adapter}
        folded={overlay.folded}
        groups={groups}
        listings={listings}
        tilesById={tilesById}
        page={page}
        theme={theme}
        reduced={reduced}
        ghostLayer={ghostLayer}
        pointerRef={pointerFold}
        onUnfold={() => controller.runAction('toggle-fold')}
        onCheckPixels={openLens}
        onFocusGroup={(letter) => controller.dispatch({ type: 'focus-group', letter })}
        onAnnounce={announce}
      />
      <div ref={ghostLayer} className="ft-ghosts" aria-hidden="true" />
      <div className="ft-dock" data-corner={corner}>
        {overlay.cheatsheet && pillVisible(state.pill) && <Cheatsheet />}
        <Pill
          state={pill}
          ringsOn={overlay.rings}
          folded={overlay.folded}
          reportUrl={reportUrl}
          instantSlot={slotInstant}
          actions={{
            onToggleRings: () => {
              setSlotInstant(false);
              controller.runAction('toggle-rings');
            },
            onToggleFold: () => {
              pointerFold.current = true;
              controller.runAction('toggle-fold');
            },
            onDismiss: () => controller.pill({ type: 'dismiss' }),
          }}
        />
      </div>
      {lens.shown && lensView && (
        <ProofLens
          lens={lens.shown}
          view={lensView}
          imageOf={(id) => listings[id]?.imageUrl ?? ''}
          measure={measure}
          dispatch={controller.dispatch}
          leaving={lens.leaving}
          reduced={reduced}
        />
      )}
      <div className="ft-sr" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
