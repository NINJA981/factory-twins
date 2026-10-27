// The marker circle: one monoline, slightly irregular china-marker loop around the five twin tiles,
// drawn once in the hero (DESIGN.md "The marker circle"). The outline is computed from the tiles' real
// positions, so it stays correct at 3 and 4 columns; a seeded wobble keeps it hand-made, and the end
// overlaps the start. The path is never produced by a filter.

interface P {
  x: number;
  y: number;
}

/** Seeded, so every visit draws the same loop. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function snapNear(values: number[], tol = 3): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) if (out.length === 0 || v - (out[out.length - 1] as number) > tol) out.push(v);
  return out;
}

/** Lattice outline (clockwise, screen coordinates) of a set of grid cells. */
function outline(cells: Set<string>): Array<[number, number]> {
  const has = (c: number, r: number) => cells.has(`${c},${r}`);
  const next = new Map<string, [number, number]>();
  for (const key of cells) {
    const [c, r] = key.split(',').map(Number) as [number, number];
    if (!has(c, r - 1)) next.set(`${c},${r}`, [c + 1, r]);
    if (!has(c + 1, r)) next.set(`${c + 1},${r}`, [c + 1, r + 1]);
    if (!has(c, r + 1)) next.set(`${c + 1},${r + 1}`, [c, r + 1]);
    if (!has(c - 1, r)) next.set(`${c},${r + 1}`, [c, r]);
  }
  const first = next.keys().next().value as string | undefined;
  if (!first) return [];
  const pts: Array<[number, number]> = [];
  let cur = first;
  for (let guard = 0; guard < 200; guard++) {
    const [x, y] = cur.split(',').map(Number) as [number, number];
    pts.push([x, y]);
    const n = next.get(cur);
    if (!n) break;
    cur = `${n[0]},${n[1]}`;
    if (cur === first) break;
  }
  // Drop collinear vertices.
  return pts.filter((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length] as [number, number];
    const b = pts[(i + 1) % pts.length] as [number, number];
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
}

export function markerPath(tiles: Element[], within: Element): string {
  const base = within.getBoundingClientRect();
  const rects = tiles.map((t) => t.getBoundingClientRect());
  if (rects.length === 0) return '';
  const lefts = snapNear(rects.map((r) => r.left));
  const tops = snapNear(rects.map((r) => r.top));
  const idx = (v: number, arr: number[]) => arr.findIndex((a) => Math.abs(a - v) <= 3);
  const cells = new Set(rects.map((r) => `${idx(r.left, lefts)},${idx(r.top, tops)}`));
  const poly = outline(cells);
  if (poly.length < 3) return '';

  // Lattice index -> pixel. Edges sit at the tile edges (the ring lives 4 px outside them).
  const rightOf = (c: number) =>
    Math.max(...rects.filter((r) => idx(r.left, lefts) === c).map((r) => r.right));
  const bottomOf = (rr: number) =>
    Math.max(...rects.filter((r) => idx(r.top, tops) === rr).map((r) => r.bottom));
  const px = (c: number) => (c < lefts.length ? (lefts[c] as number) : rightOf(c - 1));
  const py = (rr: number) => (rr < tops.length ? (tops[rr] as number) : bottomOf(rr - 1));
  const pad = 12;
  const rand = rng(7);
  const pts: P[] = poly.map(([c, rr], i) => {
    const prev = poly[(i + poly.length - 1) % poly.length] as [number, number];
    const nxt = poly[(i + 1) % poly.length] as [number, number];
    const norm = (a: [number, number], b: [number, number]): P => {
      const dx = Math.sign(b[0] - a[0]);
      const dy = Math.sign(b[1] - a[1]);
      return { x: dy, y: -dx };
    };
    const n1 = norm(prev, [c, rr]);
    const n2 = norm([c, rr], nxt);
    const wob = 1 + (rand() - 0.5) * 0.2;
    // Lattice lines between tiles sit in the open gap and take no offset (the loop must not cut into a
    // neighbouring tile); lines on the outside of the cluster stand off by `pad`.
    const outerX = c === 0 || c === lefts.length;
    const outerY = rr === 0 || rr === tops.length;
    let x = px(c);
    let y = py(rr);
    if (!outerX) x = ((lefts[c] as number) + rightOf(c - 1)) / 2;
    if (!outerY) y = ((tops[rr] as number) + bottomOf(rr - 1)) / 2;
    return {
      x: x - base.left + (outerX ? (n1.x + n2.x) * pad * wob : 0) + (rand() - 0.5) * 4,
      y: y - base.top + (outerY ? (n1.y + n2.y) * pad * wob : 0) + (rand() - 0.5) * 4,
    };
  });

  // Round every corner with a quadratic curve; start mid-edge, finish a little past the start.
  const f = (n: number) => n.toFixed(1);
  const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const n = pts.length;
  let d = '';
  const start = mid(pts[0] as P, pts[1 % n] as P);
  d += `M${f(start.x)} ${f(start.y)}`;
  for (let k = 1; k <= n; k++) {
    const corner = pts[k % n] as P;
    const prev = pts[(k - 1) % n] as P;
    const nextP = pts[(k + 1) % n] as P;
    const len1 = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const len2 = Math.hypot(nextP.x - corner.x, nextP.y - corner.y);
    const r = Math.min(34, len1 / 2, len2 / 2);
    const a = lerp(corner, prev, r / len1);
    const b = lerp(corner, nextP, r / len2);
    d += ` L${f(a.x)} ${f(a.y)} Q${f(corner.x)} ${f(corner.y)} ${f(b.x)} ${f(b.y)}`;
  }
  // Overlap: continue past the start along the first edge, nudged inward like a real second pass.
  const p0 = pts[0] as P;
  const p1 = pts[1 % n] as P;
  const over = lerp(start, p1, 0.22);
  const inward = { x: (p0.y - p1.y) * 0.02, y: (p1.x - p0.x) * 0.02 };
  d += ` L${f(over.x + inward.x)} ${f(over.y + inward.y)}`;
  return d;
}
