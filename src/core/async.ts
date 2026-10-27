// Small async helpers with no platform dependencies.

/** Splits `items` into arrays of at most `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be a positive integer');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Maps with at most `concurrency` calls in flight; results keep input order. A rejected call
 * rejects the whole map (callers that want per-item errors return them as values).
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError('concurrency must be ≥ 1');
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/**
 * Serialises async critical sections (read-modify-write of storage from concurrent messages).
 * A failing section does not block the ones queued after it.
 */
export function createMutex(): <T>(section: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(section: () => Promise<T>): Promise<T> => {
    const run = tail.then(section, section);
    tail = run.catch(() => undefined);
    return run;
  };
}

/** Calls `fn` once `ms` after the last call; `flush` runs a pending call now. */
export function debounce(fn: () => void, ms: number, timers: Timers = globalTimers) {
  let handle: unknown = null;
  const wrapped = () => {
    if (handle != null) timers.clear(handle);
    handle = timers.set(() => {
      handle = null;
      fn();
    }, ms);
  };
  wrapped.cancel = () => {
    if (handle != null) timers.clear(handle);
    handle = null;
  };
  wrapped.flush = () => {
    if (handle == null) return;
    timers.clear(handle);
    handle = null;
    fn();
  };
  return wrapped;
}

export interface Timers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export const globalTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};
