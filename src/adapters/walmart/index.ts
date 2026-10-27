import type { StoreAdapter } from '../types';
import { buildListing } from '../listing';
import { extractWalmartTile, walmartTileId } from './extract';
import { isWalmartSearchUrl, readWalmartQuery } from './query';
import { WALMART } from './selectors';

export const walmartAdapter: StoreAdapter = {
  store: 'walmart-us',
  version: 1,
  matches: isWalmartSearchUrl,
  readQuery: readWalmartQuery,
  resultsContainer(root) {
    for (const sel of WALMART.resultsContainer) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  },
  findTiles(root) {
    return [...root.querySelectorAll(WALMART.tile)].filter((tile) => {
      if (tile.closest(WALMART.carousel)) return false;
      if (tile.parentElement?.closest(WALMART.tile)) return false;
      return walmartTileId(tile) != null;
    });
  },
  tileId: walmartTileId,
  readTile(tile, ctx) {
    return buildListing('walmart-us', extractWalmartTile(tile), ctx);
  },
  foldInsertion(leader) {
    const parent = leader.parentElement;
    if (!parent) return null;
    return { parent, before: leader, rowStyle: { flexBasis: '100%', width: '100%', gridColumn: '1 / -1' } };
  },
  pillPlacement() {
    return { corner: 'bottom-right', avoid: [] };
  },
};
