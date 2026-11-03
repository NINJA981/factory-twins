import { describe, expect, it } from 'vitest';
import { cleanByline, heuristicBrand, normalizeBrand, resolveBrand } from '../../src/core/text/brand';
import {
  jaccard,
  meaningfulTokens,
  normalizeText,
  singularize,
  tokenize,
} from '../../src/core/text/normalize';
import { parsePackCount } from '../../src/core/text/packCount';
import { firstClause, titleFeatures, titlesCompatible, titleStem } from '../../src/core/text/titleSanity';

describe('parsePackCount (SPEC section 8.5)', () => {
  // Titles typed by hand in the style of public listings; every brand is invented.
  const certain: [string, number][] = [
    ['Plumbrook Silicone Spatula Set 2 Pack Heat Resistant', 2],
    ['Tessaly LED Strip Lights, 3-Pack, 16ft Each', 3],
    ['Corvane Cable Ties (2-Pack) Black', 2],
    ['Ondrel Dog Waste Bags Pack of 3 Unscented', 3],
    ['Kaxon Phone Tripod Set of 4 Mini Stands', 4],
    ['Nuvik Plant Pots x2 Ceramic', 2],
    ['Nuvik Plant Pots X 6 Ceramic', 6],
    ['Brightly Dish Sponges 12 Count Non-Scratch', 12],
    ['Brightly Dish Sponges 100ct Heavy Duty', 100],
    ['Torvex Kitchen Scale 1 Pack Digital', 1],
    ['Torvex Kitchen Scale, Single Pack', 1],
    ['Melko Storage Bins two pack Foldable', 2],
    ['Melko Storage Bins Three Pack Foldable', 3],
    ['Delta Cable Organizer 5pk Adhesive', 5],
    ['Delta Cable Organizer 10 Pk Adhesive', 10],
    ['Pexor Ring Light Bundle of 2 with Stand', 2],
    ['Pexor Face Masks Box of 50', 50],
    ['Zixal Laundry Bags (Pack of 2)', 2],
    ['Yarex Wall Hooks, 24 Count, Heavy Duty', 24],
    ['Qintu Acrylic Paint Set 2-pack Washable', 2],
    ['Laptop Stand Aluminum Foldable', 1],
    ['Plumbrook Laptop Stand for Desk Adjustable Height', 1],
    ['Torvex Digital Scale with 0.1g Precision', 1],
    ['USB C Hub 7 in 1 with 4K HDMI', 1],
    ['Phone Tripod 60 Inch Extendable', 1],
    ['LED Strip Lights 100ft RGB 5050', 1],
    ['Ceramic Planter 6 inch with Drainage', 1],
    ['Shower Caddy 3 Tier Adhesive', 1],
    ['Notebook 12x8 inch Spiral', 1],
    ['Wall Mount Shelf Set of Two', 2],
  ];
  it.each(certain)('%s -> %i', (title, count) => {
    const p = parsePackCount(title);
    expect(p.count).toBe(count);
    expect(p.certain).toBe(true);
  });

  const uncertain = [
    'Melko Cleaning Cloths Multipack Assorted',
    'Zixal Variety Pack Snack Box',
    'Bulk Zip Ties Black Heavy Duty',
    'Value Pack Sponges Large',
    'Cable Ties 2 Pack and 3 Pack Combo',
    'Combo Pack Hair Clips 6 Pack or 12 Pack',
  ];
  it.each(uncertain)('marks "%s" as an uncertain pack', (title) => {
    const p = parsePackCount(title);
    expect(p.count).toBe(1);
    expect(p.certain).toBe(false);
  });

  it('ignores absurd counts', () => {
    expect(parsePackCount('Super Pack 9999 Pack Nails').count).toBe(1);
  });
});

describe('normalizeText and tokens', () => {
  it('lowercases, strips diacritics, marks and punctuation', () => {
    expect(normalizeText('  Café™  Stand — Pro!! ')).toBe('cafe stand pro');
    expect(normalizeText('Salt & Pepper')).toBe('salt and pepper');
    expect(normalizeText('10.5 Inch')).toBe('10.5 inch');
    expect(normalizeText('...')).toBe('');
  });

  it('singularises common product plurals and leaves tricky words alone', () => {
    expect(singularize('stands')).toBe('stand');
    expect(singularize('batteries')).toBe('battery');
    expect(singularize('boxes')).toBe('box');
    expect(singularize('glass')).toBe('glass');
    expect(singularize('bus')).toBe('bus');
    expect(singularize('usb3')).toBe('usb3');
    expect(singularize('led')).toBe('led');
  });

  it('keeps product words and drops numbers, measurements and stopwords', () => {
    expect(meaningfulTokens('Premium Laptop Stands for 15 inch MacBook 2 Pack')).toEqual([
      'laptop',
      'stand',
      'macbook',
    ]);
    expect(tokenize('')).toEqual([]);
  });

  it('computes Jaccard similarity', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3);
    expect(jaccard(new Set(), new Set())).toBe(0);
    expect(jaccard(new Set(['a']), new Set(['a']))).toBe(1);
  });
});

describe('title sanity check (SPEC section 8.4)', () => {
  const feat = (t: string, brand: string | null = null) => titleFeatures(t, brand);

  it('finds the head noun in the first clause', () => {
    expect(firstClause('Plumbrook Adjustable Laptop Stand for Desk, Aluminum')).toBe(
      'Plumbrook Adjustable Laptop Stand',
    );
    expect(feat('Plumbrook Adjustable Laptop Stand for Desk, Aluminum', 'Plumbrook').headNouns.has('stand')).toBe(
      true,
    );
  });

  it('passes two titles that share a head noun', () => {
    expect(
      titlesCompatible(
        feat('Tessaly Foldable Laptop Stand with Cooling Vents', 'Tessaly'),
        feat('CORVANE Aluminum Notebook Stand, Ergonomic Riser', 'CORVANE'),
      ),
    ).toBe(true);
  });

  it('rejects two unrelated products that could share a blank photo', () => {
    expect(
      titlesCompatible(
        feat('Tessaly Foldable Laptop Stand', 'Tessaly'),
        feat('Torvex Digital Kitchen Scale 0.1g', 'Torvex'),
      ),
    ).toBe(false);
  });

  it('passes on token overlap even without a shared head noun', () => {
    expect(
      titlesCompatible(
        feat('Aluminum Laptop Riser Stand Foldable Portable'),
        feat('Portable Aluminum Foldable Notebook Table'),
      ),
    ).toBe(true);
  });

  it('does not count the brand as shared content', () => {
    const a = feat('Plumbrook Laptop Stand', 'Plumbrook');
    const b = feat('Plumbrook Kitchen Scale', 'Plumbrook');
    expect(titlesCompatible(a, b)).toBe(false);
  });

  it('builds a title stem without colours, sizes, packs and brand', () => {
    const a = titleStem('Plumbrook Foldable Laptop Stand Black Large', 'Plumbrook');
    const b = titleStem('Plumbrook Foldable Laptop Stand Silver Small', 'Plumbrook');
    expect([...a].sort()).toEqual(['foldable', 'laptop', 'stand']);
    expect(jaccard(a, b)).toBe(1);
  });
});

describe('brand handling', () => {
  it('cleans the byline forms stores print', () => {
    expect(cleanByline('Visit the Plumbrook Store')).toBe('Plumbrook');
    expect(cleanByline('Brand: Tessaly')).toBe('Tessaly');
    expect(cleanByline('by Corvane')).toBe('Corvane');
    expect(cleanByline('Ondrel™')).toBe('Ondrel');
    expect(cleanByline('  ')).toBeNull();
    expect(cleanByline(null)).toBeNull();
    expect(cleanByline('x'.repeat(80))).toBeNull();
  });

  it('normalises brands for comparison', () => {
    expect(normalizeBrand('Pro-Brand')).toBe('probrand');
    expect(normalizeBrand('PRO BRAND')).toBe('probrand');
    expect(normalizeBrand('')).toBeNull();
    expect(normalizeBrand(null)).toBeNull();
  });

  it('guesses a brand from the first token, with low confidence', () => {
    expect(heuristicBrand('PLUMBROOK Laptop Stand for Desk')).toEqual({
      brand: 'PLUMBROOK',
      confidence: 'heuristic',
    });
    expect(heuristicBrand('[2024 New] Tessaly Laptop Stand')).toEqual({
      brand: 'Tessaly',
      confidence: 'heuristic',
    });
    expect(heuristicBrand('laptop stand adjustable')).toEqual({ brand: null, confidence: 'none' });
    expect(heuristicBrand('12 Pack Cable Ties')).toEqual({ brand: null, confidence: 'none' });
    expect(heuristicBrand('The Best Laptop Stand')).toEqual({ brand: null, confidence: 'none' });
    expect(heuristicBrand('')).toEqual({ brand: null, confidence: 'none' });
  });

  it('prefers the byline over the title guess', () => {
    expect(resolveBrand('Visit the Corvane Store', 'PLUMBROOK Laptop Stand')).toEqual({
      brand: 'Corvane',
      confidence: 'byline',
    });
    expect(resolveBrand(null, 'PLUMBROOK Laptop Stand')).toEqual({ brand: 'PLUMBROOK', confidence: 'heuristic' });
  });
});
