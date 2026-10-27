import { chunk, createMutex } from '../core/async';
import { HASH_BATCH_SIZE, MAX_HASH_CACHE_ENTRIES } from '../core/constants';
import { emptyCounter, normalizeCounter, recordReads, type ReadRecord } from '../core/net';
import { applySettingsPatch, normalizeSettings, type SettingsPatch } from '../core/settings';
import { RecordLru } from '../core/session/lruCache';
import {
  evictSessions,
  mergePageScan,
  touchIndex,
  trimSessionToBudget,
  type PageScan,
  type SessionIndexEntry,
} from '../core/session/merge';
import type { ImageHashes, NetworkCounter, QuerySession, Settings } from '../core/types';
import type { HashImagesResult, PixelDiffReply, TabSummary } from '../messaging/protocol';
import type { DiffRequest, Hasher, HashRequest } from '../hasher/types';
import type { KeyValueArea } from '../storage/kv';

// The background coordinator (ADR decision 4): owns storage, routes hashing, merges query sessions.
// No chrome.* here; entrypoints/background.ts wires it to messaging and real storage.

export const KEYS = {
  settings: 'settings',
  hashCache: 'hashCache',
  net: 'net',
  queryIndex: 'qindex',
  tab: (tabId: number) => `tab:${tabId}`,
} as const;

const isQueryKey = (k: string) => k.startsWith('q:');

export const UNDO_WINDOW_MS = 10_000;

export interface CoordinatorDeps {
  session: KeyValueArea;
  local: KeyValueArea;
  hasher: Hasher;
  now?: () => number;
  /** Token source for undo (tests pass a counter). */
  token?: () => string;
}

interface UndoSnapshot {
  expires: number;
  entries: [string, unknown][];
}

export function createCoordinator(deps: CoordinatorDeps) {
  const now = deps.now ?? (() => Date.now());
  const token = deps.token ?? (() => Math.random().toString(36).slice(2));
  const lock = createMutex();
  const undo = new Map<string, UndoSnapshot>();

  async function loadCache(): Promise<RecordLru<ImageHashes>> {
    return new RecordLru(
      MAX_HASH_CACHE_ENTRIES,
      (await deps.session.get<Record<string, ImageHashes>>(KEYS.hashCache)) ?? {},
    );
  }

  async function addReads(records: readonly ReadRecord[]): Promise<void> {
    if (records.length === 0) return;
    const counter = normalizeCounter(await deps.session.get(KEYS.net));
    await deps.session.set(KEYS.net, recordReads(counter, records));
  }

  async function getSettings(): Promise<Settings> {
    return normalizeSettings(await deps.local.get(KEYS.settings));
  }

  return {
    getSettings,

    setSettings(patch: SettingsPatch): Promise<Settings> {
      return lock(async () => {
        const next = applySettingsPatch(await getSettings(), patch);
        await deps.local.set(KEYS.settings, next);
        return next;
      });
    },

    async getNetworkCounter(): Promise<NetworkCounter> {
      return normalizeCounter((await deps.session.get(KEYS.net)) ?? emptyCounter());
    },

    /**
     * Scan sequence (ADR): answer cache hits at once; send misses to the hasher in batches of 12;
     * write the cache and the network counter; never cache a failure (a later visit retries).
     */
    async hashImages(req: HashRequest): Promise<HashImagesResult> {
      const out: HashImagesResult = {};
      const cache = await loadCache();
      const misses: string[] = [];
      for (const url of new Set(req.urls)) {
        const hit = cache.get(url);
        if (hit) out[url] = { ok: true, hashes: hit };
        else misses.push(url);
      }
      const fresh: [string, ImageHashes][] = [];
      const records: ReadRecord[] = [];
      for (const batch of chunk(misses, HASH_BATCH_SIZE)) {
        const outcomes = await deps.hasher.hash({ store: req.store, urls: batch });
        for (const o of outcomes) {
          if (o.record) records.push(o.record);
          if (o.ok) {
            out[o.url] = { ok: true, hashes: o.hashes };
            fresh.push([o.url, o.hashes]);
          } else out[o.url] = { ok: false, error: o.error };
        }
      }
      await lock(async () => {
        if (fresh.length > 0) {
          const latest = await loadCache();
          for (const [url, h] of fresh) latest.set(url, h);
          await deps.session.set(KEYS.hashCache, latest.toRecord());
        }
        await addReads(records);
      });
      return out;
    },

    async pixelDiff(req: DiffRequest): Promise<PixelDiffReply> {
      const r = await deps.hasher.diff(req);
      await lock(() => addReads(r.records));
      return r.ok ? { ok: true, result: r.result } : { ok: false, error: r.error };
    },

    /** SPEC F8: merge into the stored session when memory is on, else return this page alone. */
    async mergeQuerySession(scan: PageScan): Promise<QuerySession> {
      const settings = await getSettings();
      if (!settings.sessionMemory) return mergePageScan(null, scan, now());
      return lock(async () => {
        const t = now();
        const prev = await deps.session.get<QuerySession>(scan.key);
        const merged = trimSessionToBudget(mergePageScan(prev, scan, t), scan.page);
        const index = touchIndex(
          (await deps.session.get<SessionIndexEntry[]>(KEYS.queryIndex)) ?? [],
          scan.key,
          t,
        );
        const { keep, evict } = evictSessions(index);
        await deps.session.set(scan.key, merged);
        await deps.session.set(KEYS.queryIndex, keep);
        await deps.session.remove(evict);
        return merged;
      });
    },

    commitLetters({ key, letters }: { key: string; letters: Record<string, string> }): Promise<void> {
      return lock(async () => {
        const s = await deps.session.get<QuerySession>(key);
        if (!s) return;
        // Only ids still in the session keep a letter (trimmed pages drop theirs).
        const kept: Record<string, string> = {};
        for (const [id, l] of Object.entries(letters)) if (s.listings[id]) kept[id] = l;
        await deps.session.set(key, { ...s, letters: kept });
      });
    },

    /** "Clear this session" (AC-F8.3): query sessions and the index go; hash cache and counter stay. */
    clearSessions(): Promise<{ undoToken: string }> {
      return lock(async () => {
        const keys = (await deps.session.keys()).filter((k) => isQueryKey(k) || k === KEYS.queryIndex);
        const entries: [string, unknown][] = [];
        for (const k of keys) entries.push([k, await deps.session.get(k)]);
        await deps.session.remove(keys);
        const t = token();
        for (const [k, snap] of undo) if (snap.expires < now()) undo.delete(k);
        undo.set(t, { expires: now() + UNDO_WINDOW_MS, entries });
        return { undoToken: t };
      });
    },

    undoClearSessions({ undoToken }: { undoToken: string }): Promise<boolean> {
      return lock(async () => {
        const snap = undo.get(undoToken);
        undo.delete(undoToken);
        if (!snap || snap.expires < now()) return false;
        for (const [k, v] of snap.entries) if (v != null) await deps.session.set(k, v);
        return true;
      });
    },

    async reportTabSummary(tabId: number, summary: TabSummary): Promise<void> {
      await deps.session.set(KEYS.tab(tabId), summary);
    },

    async getTabSummary(tabId: number): Promise<TabSummary | null> {
      return deps.session.get<TabSummary>(KEYS.tab(tabId));
    },

    async forgetTab(tabId: number): Promise<void> {
      await deps.session.remove([KEYS.tab(tabId)]);
    },
  };
}

export type Coordinator = ReturnType<typeof createCoordinator>;
