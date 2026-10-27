import type { ClusterResult } from '../core/cluster/groups';
import type { PixelDiffResult } from '../core/hash/pixelDiff';
import type { SettingsPatch } from '../core/settings';
import type { PageScan } from '../core/session/merge';
import type { ImageHashes, NetworkCounter, QuerySession, Settings, StoreId } from '../core/types';
import type { DiffOutcome, DiffRequest, HashOutcome, HashRequest, ReadError } from '../hasher/types';

// Typed runtime messages (ADR, runtime architecture). Types only; the messengers live in
// src/messaging/messengers.ts so this file can be imported anywhere without touching chrome.*.

export type HashImagesResult = Record<
  string,
  { ok: true; hashes: ImageHashes } | { ok: false; error: ReadError }
>;

export type PixelDiffReply = { ok: true; result: PixelDiffResult } | { ok: false; error: ReadError };

/** What the popup shows for the active tab (SPEC AC-F9.1). */
export interface TabSummary {
  store: StoreId;
  listings: number;
  products: number;
  twinGroups: number;
  maxBrandTaxDollars: number | null;
}

/** Content script, popup and options → background. */
export interface BackgroundProtocol {
  /** Hashes for these thumbnail URLs: cache hits at once, misses through the hasher. */
  hashImages(req: HashRequest): HashImagesResult;
  /** Proof lens measurement of two listings' photos. */
  pixelDiff(req: DiffRequest): PixelDiffReply;
  /** Joins a page scan into its query session and returns the merged session (or the page alone when memory is off). */
  mergeQuerySession(scan: PageScan): QuerySession;
  /** Persists the stable letters from the latest clustering of a session. */
  commitLetters(data: { key: string; letters: Record<string, string> }): void;
  getSettings(): Settings;
  setSettings(patch: SettingsPatch): Settings;
  getNetworkCounter(): NetworkCounter;
  /** "Clear this session" (AC-F8.3): returns a token for Undo. */
  clearSessions(): { undoToken: string };
  undoClearSessions(data: { undoToken: string }): boolean;
  /** Content script reports its latest result so the popup can show it. */
  reportTabSummary(summary: TabSummary): void;
  getTabSummary(data: { tabId: number }): TabSummary | null;
}

/** Background → Chrome offscreen document. */
export interface OffscreenProtocol {
  'offscreen:hash'(req: HashRequest): HashOutcome[];
  'offscreen:diff'(req: DiffRequest): DiffOutcome;
}

/** Background → content script in a tab. */
export interface TabProtocol {
  'tab:command'(data: { action: 'toggle-rings' | 'toggle-fold' }): void;
  'tab:settings-changed'(settings: Settings): void;
  'tab:session-cleared'(): void;
}

export type { ClusterResult };
