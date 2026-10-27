// Minimal key-value storage seam. The background coordinator talks to this, so its logic runs in
// Node tests (memory) and in the extension (wxt storage over chrome.storage) unchanged.

export interface KeyValueArea {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
  /** Every key in the area (used for "Clear this session"). */
  keys(): Promise<string[]>;
}

/** In-memory area. Values are cloned through JSON on the way in and out, like real storage. */
export function createMemoryArea(initial: Record<string, unknown> = {}): KeyValueArea & {
  dump(): Record<string, unknown>;
} {
  const data = new Map<string, string>();
  for (const [k, v] of Object.entries(initial)) data.set(k, JSON.stringify(v));
  return {
    async get<T>(key: string) {
      const raw = data.get(key);
      return raw === undefined ? null : (JSON.parse(raw) as T);
    },
    async set(key, value) {
      if (value === undefined) data.delete(key);
      else data.set(key, JSON.stringify(value));
    },
    async remove(keys) {
      for (const k of keys) data.delete(k);
    },
    async keys() {
      return [...data.keys()];
    },
    dump() {
      return Object.fromEntries([...data.entries()].map(([k, v]) => [k, JSON.parse(v) as unknown]));
    },
  };
}
