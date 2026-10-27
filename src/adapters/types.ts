import type { QueryInfo } from '../core/session/queryKey';
import type { Listing, StoreId } from '../core/types';

export interface TileContext {
  page: number;
  position: number;
  /** Page URL, for resolving relative links. */
  baseUrl: string;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PillPlacement {
  corner: 'bottom-right' | 'bottom-left';
  /** Store controls the pill must never cover (SPEC AC-F4.3), in viewport coordinates. */
  avoid: Rect[];
}

export interface FoldInsertion {
  parent: Element;
  /** Insert the fold-card host before this node. */
  before: Element;
  /** How the host spans one full row of the store's grid. */
  rowStyle: Partial<Record<'gridColumn' | 'flexBasis' | 'width', string>>;
}

/**
 * One isolated module per store (SPEC F1). Everything store-specific is behind this interface so a
 * broken store layout touches one file, and a new store is one adapter plus fixtures.
 */
export interface StoreAdapter {
  readonly store: StoreId;
  /** Bumped whenever selectors change (fixture drift policy, ADR). */
  readonly version: number;
  matches(url: URL): boolean;
  /** Null when the URL is not a search results page this adapter understands. */
  readQuery(url: URL): QueryInfo | null;
  /** The element that holds the result tiles; observed for lazy tiles. */
  resultsContainer(root: ParentNode): Element | null;
  /** Product result tiles in page order. Non-product widgets are excluded (AC-F1.2). */
  findTiles(root: ParentNode): Element[];
  /** Stable id of a tile, without reading the whole tile. */
  tileId(tile: Element): string | null;
  /** Reads one tile; null when it lacks an id, title or image (it is then not a product tile). */
  readTile(tile: Element, ctx: TileContext): Listing | null;
  /** Where a fold card for the group led by `leader` goes. */
  foldInsertion(leader: Element): FoldInsertion | null;
  pillPlacement(doc: Document): PillPlacement;
}
