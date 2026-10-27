import { describe, expect, it } from 'vitest';
import { cluster } from '../../src/core/cluster/groups';
import type { StoreId } from '../../src/core/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { readPage } from '../../src/adapters/read';
import { ADAPTERS } from '../../src/adapters/registry';
import type { ImageHashes } from '../../src/core/types';
import { FIXTURES_DIR, fixtureListings, loadFixtures, pairsOf, type Fixture } from './helpers/fixtures';

// SPEC AC-F11.2: pairwise precision >= 0.97 and recall >= 0.85 against the labels, overall and per
// store. Listings come from the real adapter run over page.html, hashes from hashes.json.

function score(fixtures: Fixture[]) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const notes: string[] = [];
  for (const f of fixtures) {
    const result = cluster({ listings: fixtureListings(f), hashes: f.hashes });
    const predicted = pairsOf(result.groups.map((g) => g.memberIds));
    const truth = pairsOf(f.labels.groups);
    for (const p of predicted) {
      if (truth.has(p)) tp++;
      else {
        fp++;
        notes.push(`${f.store}/${f.slug} false pair ${p}`);
      }
    }
    for (const p of truth) {
      if (!predicted.has(p)) {
        fn++;
        notes.push(`${f.store}/${f.slug} missed pair ${p}`);
      }
    }
  }
  return {
    precision: tp + fp === 0 ? 1 : tp / (tp + fp),
    recall: tp + fn === 0 ? 1 : tp / (tp + fn),
    tp,
    fp,
    fn,
    notes,
  };
}

const all: Record<StoreId, Fixture[]> = {
  'amazon-us': loadFixtures('amazon-us'),
  'walmart-us': loadFixtures('walmart-us'),
};
const both = [...all['amazon-us'], ...all['walmart-us']];

describe('the e2e demo page', () => {
  it('clusters into exactly its labelled groups', () => {
    const dir = join(FIXTURES_DIR, 'demo', 'laptop-stand');
    const html = readFileSync(join(dir, 'page.html'), 'utf8');
    const hashes = JSON.parse(readFileSync(join(dir, 'hashes.json'), 'utf8')) as Record<string, ImageHashes>;
    const labels = JSON.parse(readFileSync(join(dir, 'labels.json'), 'utf8')) as {
      groups: string[][];
      tiles: number;
    };
    const href = 'http://localhost:4817/s?k=laptop+stand';
    const win = new Window({ url: href });
    win.document.documentElement.innerHTML = html.replace(/^<!doctype html>/i, '');
    const read = readPage(ADAPTERS['amazon-us'], win.document as unknown as Document, href);
    if (!read.ok) throw new Error('demo page unreadable');
    expect(read.listings).toHaveLength(60);
    const { groups, summary } = cluster({ listings: read.listings, hashes });
    const key = (ids: readonly string[]) => [...ids].sort().join('|');
    expect(new Set(groups.map((g) => key(g.memberIds)))).toEqual(new Set(labels.groups.map(key)));
    expect(summary).toMatchObject({ listings: 60, twinGroups: 6, maxBrandTaxDollars: 23 });
  });
});

describe('clustering precision and recall on the fixture corpus', () => {
  for (const store of ['amazon-us', 'walmart-us'] as const) {
    it(`${store}: precision >= 0.97 and recall >= 0.85`, () => {
      const s = score(all[store]);
      expect(s.precision, s.notes.join('\n')).toBeGreaterThanOrEqual(0.97);
      expect(s.recall, s.notes.join('\n')).toBeGreaterThanOrEqual(0.85);
    });
  }

  it('overall: precision >= 0.97 and recall >= 0.85', () => {
    const s = score(both);
    expect(s.precision, s.notes.join('\n')).toBeGreaterThanOrEqual(0.97);
    expect(s.recall, s.notes.join('\n')).toBeGreaterThanOrEqual(0.85);
  });

  it('never puts two members of one variant family in the same twin group', () => {
    for (const f of both) {
      const result = cluster({ listings: fixtureListings(f), hashes: f.hashes });
      for (const family of f.labels.variantFamilies) {
        const split = result.groups.filter((g) => g.memberIds.filter((id) => family.includes(id)).length > 1);
        expect(split, `${f.store}/${f.slug}`).toHaveLength(0);
      }
    }
  });

  it('finds every labelled variant family', () => {
    for (const f of both) {
      const result = cluster({ listings: fixtureListings(f), hashes: f.hashes });
      const found = new Set(result.variantFamilies.map((v) => [...v.memberIds].sort().join('|')));
      for (const family of f.labels.variantFamilies) {
        expect(found.has([...family].sort().join('|')), `${f.store}/${f.slug}`).toBe(true);
      }
    }
  });

  it('reports the pill summary that SPEC section 3 describes', () => {
    const f = all['amazon-us'].find((x) => x.slug === 'laptop-stand') as Fixture;
    const { summary, groups } = cluster({ listings: fixtureListings(f), hashes: f.hashes });
    expect(summary.listings).toBe(f.labels.tiles);
    expect(summary.twinGroups).toBe(groups.length);
    expect(summary.products).toBeLessThan(summary.listings);
  });
});
