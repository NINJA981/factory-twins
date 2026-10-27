import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// AC-F11.1 (shape of the corpus) and AC-F11.5 (no store product photo in the repo). The corpus is
// synthetic in this repo (HANDOFF known issue 2), so these checks guard the structure and the rule that
// real-page fixtures carry hashes, never images.

const FIXTURES = resolve(__dirname, '..', 'fixtures');
const IMAGE = /\.(jpe?g|png|webp|avif|gif|bmp|ico|svg|heic)$/i;

const dirs = (store: string) =>
  readdirSync(join(FIXTURES, store)).filter((n) => statSync(join(FIXTURES, store, n)).isDirectory());
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe('fixture corpus shape (AC-F11.1)', () => {
  it('has at least 12 Amazon and 6 Walmart pages, each with the four files', () => {
    expect(dirs('amazon').length).toBeGreaterThanOrEqual(12);
    expect(dirs('walmart').length).toBeGreaterThanOrEqual(6);
    for (const store of ['amazon', 'walmart']) {
      for (const d of dirs(store)) {
        for (const f of ['page.html', 'hashes.json', 'labels.json', 'PROVENANCE.md']) {
          expect(existsSync(join(FIXTURES, store, d, f)), `${store}/${d}/${f}`).toBe(true);
        }
      }
    }
  });

  it('spans at least 8 query categories on Amazon', () => {
    expect(new Set(dirs('amazon')).size).toBeGreaterThanOrEqual(8);
  });

  it('records where each page came from', () => {
    for (const store of ['amazon', 'walmart']) {
      for (const d of dirs(store)) {
        const text = readFileSync(join(FIXTURES, store, d, 'PROVENANCE.md'), 'utf8');
        expect(text, `${store}/${d}`).toMatch(/query|date|synthetic|generator/i);
      }
    }
  });
});

describe('no store product photo is committed (AC-F11.5)', () => {
  it('keeps images out of the Amazon and Walmart fixture folders', () => {
    const images = ['amazon', 'walmart'].flatMap((s) => walk(join(FIXTURES, s)).filter((f) => IMAGE.test(f)));
    expect(images).toEqual([]);
  });

  it('keeps inline image data out of the fixture pages', () => {
    for (const store of ['amazon', 'walmart']) {
      for (const d of dirs(store)) {
        const html = readFileSync(join(FIXTURES, store, d, 'page.html'), 'utf8');
        expect(html, `${store}/${d}`).not.toMatch(/data:image\//);
      }
    }
  });

  it('stores only hashes per listing', () => {
    const first = dirs('amazon')[0] as string;
    const text = readFileSync(join(FIXTURES, 'amazon', first, 'hashes.json'), 'utf8');
    expect(text).not.toMatch(/data:|base64/);
    const hashes = JSON.parse(text) as Record<string, Record<string, unknown>>;
    const one = Object.values(hashes)[0] as Record<string, unknown>;
    expect(Object.keys(one)).toEqual(expect.arrayContaining(['dhash', 'phash']));
  });
});
