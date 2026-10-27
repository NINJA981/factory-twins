// Factory Twins engine: the one entry module the extension and the web app (site/) both import.
//
// Rule: nothing reachable from this file may touch chrome.*, browser.*, wxt/* or any other
// extension-only API (tests/unit/engine-boundary.test.ts enforces it). Platform access is passed in:
// `fetch` and an image decoder for the hasher, a `ScanClient` for scanning, a `KeyValueArea` for
// storage. DOM types (Document, Element) are fine: the web app has them too.

// Domain types
export type * from './types';
export { STORE_IDS } from './types';

// Hashing (pure, RGBA in, hex out)
export { hashImage } from './hash/index';
export { dhash } from './hash/dhash';
export { phash } from './hash/phash';
export { colorSignature, colorDistance } from './hash/color';
export { hamming } from './hash/hamming';
export { pixelDiff, type PixelDiffResult } from './hash/pixelDiff';
export { resampleSquare, type RgbaImage } from './hash/resample';

// Clustering and evidence
export {
  cluster,
  mostEstablished,
  fewReviewsWarnings,
  type ClusterInput,
  type ClusterResult,
  type ScanSummary,
} from './cluster/groups';
export { twinEdge } from './cluster/edges';
export { findVariantFamilies } from './cluster/variants';
export { letterForIndex, twinStyle, type RingPattern, type TwinSlot } from './cluster/letters';
export { brandTax, comparablePrices, ladderOrder, maxBrandTaxDollars } from './price/brandTax';
export { parsePrice, parseRating, parseCount } from './price/parse';

// Text
export { parsePackCount } from './text/packCount';
export { resolveBrand, normalizeBrand, cleanByline } from './text/brand';
export { titleFeatures, titlesCompatible, titleStem } from './text/titleSanity';
export { normalizeImageUrl } from './url';

// Sessions, settings, counters
export { queryKey, canonicalQuery, normalizeQuery, type QueryInfo } from './session/queryKey';
export { mergePageScan, trimSessionToBudget, evictSessions, type PageScan } from './session/merge';
export { RecordLru } from './session/lruCache';
export { DEFAULT_SETTINGS, normalizeSettings, applySettingsPatch, type SettingsPatch } from './settings';
export { emptyCounter, recordReads, totalReads, unexpectedHosts, type ReadRecord } from './net';
export { THRESHOLDS, type MatchThresholds } from './constants';

// UI state machines and view models (framework-free)
export { pillReducer, pillVisible, INITIAL_PILL, type PillState, type PillEvent } from './state/pill';
export {
  overlayReducer,
  defaultLensPair,
  INITIAL_OVERLAY,
  type OverlayState,
  type OverlayAction,
  type LensState,
} from './state/overlay';
export { resolveKey, commandAction, lensNudgeDelta, type KeyAction } from './keyboard';
export { foldCardView, badgeViews, type FoldCardView, type BadgeView, type Rung } from './view/groupView';
export { mapPool, chunk, createMutex } from './async';

// Store adapters (DOM in, Listing out)
export { ADAPTERS, adapterForUrl } from '../adapters/registry';
export { readPage, type PageReadResult } from '../adapters/read';
export type { StoreAdapter } from '../adapters/types';

// Scanning and hashing pipelines with injected platform access
export { scanDocument, type ScanClient, type ScanOutcome } from '../content/scan';
export { readImage, IMAGE_FETCH_INIT } from '../hasher/fetchPixels';
export { createHashService } from '../hasher/service';
export { checkImageUrl, IMAGE_HOSTS } from '../hasher/allowlist';
export type { Hasher, ReadResult, DecodeImage } from '../hasher/types';
export { createMemoryArea, type KeyValueArea } from '../storage/kv';
export { createCoordinator, type Coordinator } from '../background/coordinator';
