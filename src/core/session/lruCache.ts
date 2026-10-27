/**
 * Insertion-ordered LRU over a plain record, so it can be persisted as JSON in storage.session
 * (hash cache, SPEC §10: ≤ 5,000 entries). `get` refreshes recency; `set` evicts the oldest.
 */
export class RecordLru<V> {
  private readonly map: Map<string, V>;

  constructor(
    private readonly max: number,
    entries: Readonly<Record<string, V>> | Iterable<[string, V]> = {},
  ) {
    if (!Number.isInteger(max) || max < 1) throw new RangeError('max must be a positive integer');
    const iter = Symbol.iterator in entries ? (entries as Iterable<[string, V]>) : Object.entries(entries);
    this.map = new Map(iter);
    this.evict();
  }

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    this.evict();
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  toRecord(): Record<string, V> {
    return Object.fromEntries(this.map);
  }

  private evict(): void {
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }
}
