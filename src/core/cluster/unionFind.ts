/** Disjoint-set forest with path halving and union by size. */
export class UnionFind {
  private readonly parent: Int32Array;
  private readonly size: Int32Array;

  constructor(n: number) {
    this.parent = new Int32Array(n);
    this.size = new Int32Array(n).fill(1);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }

  find(x: number): number {
    let i = x;
    while (this.parent[i] !== i) {
      const p = this.parent[i] as number;
      this.parent[i] = this.parent[p] as number;
      i = p;
    }
    return i;
  }

  union(a: number, b: number): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if ((this.size[ra] as number) < (this.size[rb] as number)) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    this.size[ra] = (this.size[ra] as number) + (this.size[rb] as number);
    return true;
  }

  /** Components as index lists, each sorted ascending, ordered by their smallest index. */
  components(): number[][] {
    const byRoot = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const r = this.find(i);
      const list = byRoot.get(r);
      if (list) list.push(i);
      else byRoot.set(r, [i]);
    }
    return [...byRoot.values()].sort((a, b) => (a[0] as number) - (b[0] as number));
  }
}
