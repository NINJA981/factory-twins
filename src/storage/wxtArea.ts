import { storage } from 'wxt/utils/storage';
import type { KeyValueArea } from './kv';

// KeyValueArea over WXT storage (chrome.storage / browser.storage). `session` holds the hash cache,
// query sessions and the network counter (cleared when the browser session ends); `local` holds
// settings only (SPEC §10).

export type AreaName = 'local' | 'session';

export function wxtArea(area: AreaName): KeyValueArea {
  const k = (key: string) => `${area}:${key}` as const;
  return {
    async get<T>(key: string) {
      return storage.getItem<T>(k(key));
    },
    async set(key, value) {
      await storage.setItem(k(key), value);
    },
    async remove(keys) {
      if (keys.length > 0) await storage.removeItems(keys.map(k));
    },
    async keys() {
      const snapshot = await storage.snapshot(area);
      return Object.keys(snapshot).filter((key) => !key.endsWith('$'));
    },
  };
}
