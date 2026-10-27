// Group letters (SPEC AC-F3.4): A, B, C… in order of first appearance in the query session, stable
// across re-scans and pages. After Z: AA, AB, … (bijective base 26).

export function letterForIndex(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new RangeError(`Bad letter index ${index}`);
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function indexForLetter(letter: string): number {
  if (!/^[A-Z]+$/.test(letter)) throw new RangeError(`Bad letter ${letter}`);
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export interface LetterRequest {
  /** Members of the group, any order. */
  memberIds: readonly string[];
}

/**
 * Assigns letters to groups given in first-appearance order. A group keeps the letter most of its
 * members carried before (ties: the earlier letter); letters already taken in this pass are not
 * reused; groups without a previous letter get the next letter after every letter ever used in
 * this session, so a vanished group's letter is never recycled for a different photo.
 */
export function assignLetters(
  groups: readonly LetterRequest[],
  previous: Readonly<Record<string, string>>,
): { letters: string[]; map: Record<string, string> } {
  let next = 0;
  for (const l of Object.values(previous)) next = Math.max(next, indexForLetter(l) + 1);
  const taken = new Set<string>();
  const letters: string[] = new Array<string>(groups.length);

  // Strongest claims first, so a group that clearly owns a letter keeps it.
  const claims = groups.map((g, gi) => {
    const votes = new Map<string, number>();
    for (const id of g.memberIds) {
      const l = previous[id];
      if (l) votes.set(l, (votes.get(l) ?? 0) + 1);
    }
    const ranked = [...votes.entries()].sort(
      (a, b) => b[1] - a[1] || indexForLetter(a[0]) - indexForLetter(b[0]),
    );
    return { gi, ranked };
  });
  claims.sort((a, b) => (b.ranked[0]?.[1] ?? 0) - (a.ranked[0]?.[1] ?? 0) || a.gi - b.gi);
  for (const { gi, ranked } of claims) {
    const free = ranked.find(([l]) => !taken.has(l));
    if (free) {
      letters[gi] = free[0];
      taken.add(free[0]);
    }
  }
  for (let gi = 0; gi < groups.length; gi++) {
    if (letters[gi]) continue;
    let l = letterForIndex(next++);
    while (taken.has(l)) l = letterForIndex(next++);
    letters[gi] = l;
    taken.add(l);
  }

  const map: Record<string, string> = { ...previous };
  groups.forEach((g, gi) => {
    for (const id of g.memberIds) map[id] = letters[gi] as string;
  });
  return { letters, map };
}

export type RingPattern = 'solid' | 'dashed' | 'dotted' | 'double' | 'solid-notch' | 'dashed-notch';
export type TwinSlot = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

const SLOTS: readonly TwinSlot[] = ['a', 'b', 'c', 'd', 'e', 'f'];
const PATTERNS: readonly RingPattern[] = [
  'solid',
  'dashed',
  'dotted',
  'double',
  'solid-notch',
  'dashed-notch',
];

/**
 * Colour slot and ring pattern for a letter (DESIGN.md › Twin palette). A–F use their own pairs;
 * later letters cycle the colours with shifted patterns (G = A's colour, dotted), so colour plus
 * pattern stays distinct for the first 18 groups and the letter is always the unique key.
 */
export function twinStyle(letter: string): { slot: TwinSlot; pattern: RingPattern } {
  const i = indexForLetter(letter);
  const cycle = Math.floor(i / SLOTS.length);
  return {
    slot: SLOTS[i % SLOTS.length] as TwinSlot,
    pattern: PATTERNS[(i + cycle * 2) % PATTERNS.length] as RingPattern,
  };
}
