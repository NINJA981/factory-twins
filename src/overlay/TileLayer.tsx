import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import tileCss from '../styles/tile.css?inline';
import { VARIANTS_OF_ONE } from '../copy/strings';
import { twinStyle } from '../core/view/twinStyle';
import type { Scheme } from './pageScheme';

// Rings and badges (SPEC F5). Each decorated tile gets one small shadow host appended inside it, so
// the ring and badge ride along with the tile through scroll, resize and lazy loading. Everything
// added to a tile is recorded and removed again when rings go off (SPEC AC-F6.7: no leftovers).

export type TileDecor =
  { kind: 'twin'; letter: string; label: string; tip: string } | { kind: 'variants'; label: string };

export const TILE_HOST_TAG = 'factory-twins-tile';

interface TileHost {
  tile: Element;
  host: HTMLElement;
  mount: HTMLElement;
  radius: number;
  /** What to put back on the tile: only set when the tile was `position: static`. */
  restore: null | { hadStyleAttr: boolean; previous: string; priority: string };
}

/** The store's own corner radius: the tile's, else the first descendant that fills it. */
export function tileRadius(tile: Element): number {
  const view = tile.ownerDocument.defaultView;
  if (!view) return 0;
  const own = parseFloat(view.getComputedStyle(tile).borderTopLeftRadius);
  if (own > 0) return own;
  const box = tile.getBoundingClientRect();
  const stack: Element[] = [...tile.children];
  for (let depth = 0; stack.length && depth < 40; depth++) {
    const el = stack.shift() as Element;
    const r = el.getBoundingClientRect();
    if (Math.abs(r.width - box.width) <= 2 && Math.abs(r.height - box.height) <= 2) {
      const radius = parseFloat(view.getComputedStyle(el).borderTopLeftRadius);
      if (radius > 0) return radius;
      stack.push(...el.children);
    }
  }
  return 0;
}

export function createTileHost(tile: Element, theme: Scheme): TileHost {
  const doc = tile.ownerDocument;
  const view = doc.defaultView;
  const el = tile as HTMLElement;
  let restore: TileHost['restore'] = null;
  if (view && view.getComputedStyle(tile).position === 'static') {
    restore = {
      hadStyleAttr: tile.hasAttribute('style'),
      previous: el.style.getPropertyValue('position'),
      priority: el.style.getPropertyPriority('position'),
    };
    el.style.setProperty('position', 'relative');
  }
  const host = doc.createElement(TILE_HOST_TAG);
  host.setAttribute('data-theme', theme);
  Object.assign(host.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    pointerEvents: 'none',
    zIndex: '2',
    margin: '0',
    padding: '0',
  });
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = tileCss;
  const mount = doc.createElement('div');
  shadow.append(style, mount);
  tile.append(host);
  return { tile, host, mount, radius: tileRadius(tile), restore };
}

export function releaseTileHost(rec: TileHost): void {
  rec.host.remove();
  if (rec.restore) {
    const el = rec.tile as HTMLElement;
    if (rec.restore.previous) el.style.setProperty('position', rec.restore.previous, rec.restore.priority);
    else el.style.removeProperty('position');
    if (!rec.restore.hadStyleAttr && el.getAttribute('style') === '') el.removeAttribute('style');
  }
}

interface TileLayerProps {
  tiles: ReadonlyMap<string, Element>;
  decor: ReadonlyMap<string, TileDecor>;
  theme: Scheme;
  /** Letter whose members are outlined (badge hover or focus). */
  activeLetter: string | null;
  hint: string;
  onActivate(letter: string | null): void;
  onOpenLens(letter: string): void;
}

export function TileLayer(props: TileLayerProps) {
  const hosts = useRef(new Map<Element, TileHost>());
  const [mounts, setMounts] = useState<Array<{ id: string; rec: TileHost }>>([]);

  useLayoutEffect(() => {
    const wanted = new Map<Element, string>();
    for (const id of props.decor.keys()) {
      const tile = props.tiles.get(id);
      if (tile?.isConnected) wanted.set(tile, id);
    }
    for (const [tile, rec] of hosts.current) {
      if (!wanted.has(tile)) {
        releaseTileHost(rec);
        hosts.current.delete(tile);
      }
    }
    const list: Array<{ id: string; rec: TileHost }> = [];
    for (const [tile, id] of wanted) {
      let rec = hosts.current.get(tile);
      if (!rec) {
        rec = createTileHost(tile, props.theme);
        hosts.current.set(tile, rec);
      }
      rec.host.setAttribute('data-theme', props.theme);
      list.push({ id, rec });
    }
    // Syncing with an external system (DOM hosts inside the store's tiles), then rendering into them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounts(list);
  }, [props.tiles, props.decor, props.theme]);

  useEffect(
    () => () => {
      for (const rec of hosts.current.values()) releaseTileHost(rec);
      hosts.current.clear();
    },
    [],
  );

  return (
    <>
      {mounts.map(({ id, rec }) => {
        const d = props.decor.get(id);
        if (!d) return null;
        return createPortal(
          <TileDecorView
            key={id}
            decor={d}
            radius={rec.radius}
            active={d.kind === 'twin' && props.activeLetter === d.letter}
            hint={props.hint}
            onActivate={props.onActivate}
            onOpenLens={props.onOpenLens}
          />,
          rec.mount,
          id,
        );
      })}
    </>
  );
}

function TileDecorView({
  decor,
  radius,
  active,
  hint,
  onActivate,
  onOpenLens,
}: {
  decor: TileDecor;
  radius: number;
  active: boolean;
  hint: string;
  onActivate(letter: string | null): void;
  onOpenLens(letter: string): void;
}) {
  const tipId = useId();
  if (decor.kind === 'variants') {
    return (
      <div className="tile ft-ui">
        <div className="badge-wrap">
          <span className="chip" title={VARIANTS_OF_ONE}>
            {decor.label}
          </span>
        </div>
      </div>
    );
  }
  const s = twinStyle(decor.letter);
  return (
    <div
      className="tile ft-ui"
      style={
        {
          ['--g' as string]: `var(--twin-${s.color})`,
          ['--tile-radius' as string]: `${radius}px`,
        } as CSSProperties
      }
    >
      <div
        className="ring"
        data-pattern={s.pattern}
        data-notch={s.notch ? '' : undefined}
        data-active={active ? '' : undefined}
      />
      <div
        className="badge-wrap"
        onPointerEnter={() => onActivate(decor.letter)}
        onPointerLeave={() => onActivate(null)}
      >
        <button
          type="button"
          className="badge"
          aria-describedby={tipId}
          aria-haspopup="dialog"
          onFocus={() => onActivate(decor.letter)}
          onBlur={() => onActivate(null)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopPropagation();
            onOpenLens(decor.letter);
          }}
        >
          {decor.label}
        </button>
        <div className="tip" role="tooltip" id={tipId}>
          <p>{decor.tip}</p>
          <p className="hint">
            {hint}
            <kbd>P</kbd>
          </p>
        </div>
      </div>
    </div>
  );
}
