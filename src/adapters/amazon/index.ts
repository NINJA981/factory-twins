import type { StoreAdapter } from '../types';
import { buildListing } from '../listing';
import { amazonTileId, extractAmazonTile } from './extract';
import { isAmazonSearchUrl, readAmazonQuery } from './query';
import { AMAZON } from './selectors';

export const amazonAdapter: StoreAdapter = {
  store: 'amazon-us',
  version: 1,
  matches: isAmazonSearchUrl,
  readQuery: readAmazonQuery,
  resultsContainer(root) {
    for (const sel of AMAZON.resultsContainer) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  },
  findTiles(root) {
    return [...root.querySelectorAll(AMAZON.tile)].filter((tile) => {
      if (!amazonTileId(tile)) return false;
      // A result nested inside another result is a widget card (carousel), not a grid tile.
      return !tile.parentElement?.closest(AMAZON.tile);
    });
  },
  tileId: amazonTileId,
  readTile(tile, ctx) {
    return buildListing('amazon-us', extractAmazonTile(tile), ctx);
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
