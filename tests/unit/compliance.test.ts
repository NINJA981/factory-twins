import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as copy from '../../src/copy/strings';
import type { ScanSummary } from '../../src/core/cluster/groups';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p: string) => relative(ROOT, p).replaceAll('\\', '/');

function walk(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p, exts) : exts.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

const SOURCE = [
  ...walk(join(ROOT, 'src'), ['.ts', '.tsx', '.css']),
  ...walk(join(ROOT, 'entrypoints'), ['.ts', '.tsx', '.html']),
];
const text = (p: string) => readFileSync(p, 'utf8');
const stringsOf = (o: object): string[] =>
  Object.values(o).filter((v: unknown): v is string => typeof v === 'string');

// SPEC AC-X.1 and AC-F6.6: the product claims the photo is the same, never that the item is.
const BANNED = [
  /same item/i,
  /same product/i,
  /identical product/i,
  /\bdupes?\b/i,
  /knock-?offs?/i,
  /\bcounterfeit/i,
  /\bfakes?\b/i,
  /lorem/i,
  /ipsum/i,
];

describe('copy lint (AC-X.1, AC-F6.6)', () => {
  it('finds no banned phrase or placeholder text in any user-facing source', () => {
    const hits: string[] = [];
    for (const file of SOURCE.filter((f) => /\.(tsx?|html)$/.test(f))) {
      const lines = text(file).split('\n');
      lines.forEach((line, i) => {
        for (const re of BANNED) if (re.test(line)) hits.push(`${rel(file)}:${i + 1} ${re}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('finds none in anything the copy functions can produce', () => {
    const summary: ScanSummary = {
      listings: 60,
      products: 47,
      twinGroups: 6,
      maxBrandTaxDollars: 18,
      pages: [1, 2],
    };
    const produced: string[] = [
      ...copy.pillSegments(summary),
      copy.pillAccessibleName(summary),
      copy.pillScanning(24, 60),
      copy.pillNoTwins(60),
      copy.badgeLabel('A', 5),
      copy.sameAsOthers(4),
      copy.seenAcrossPages(9, 3),
      copy.foldHeader(5),
      copy.brandTaxTag(23, false),
      copy.brandTaxTag(2, true),
      copy.fewReviewsNote(14203),
      copy.variantsChip(3),
      copy.lensReadout(996),
      copy.lensDiffering(4),
      copy.imageReadsLine({ 'm.media-amazon.com': 184 }),
      copy.imageReadsLine({}),
      copy.foldAnnouncement(2),
      copy.onForStore('amazon-us'),
      ...stringsOf(copy),
      ...Object.values(copy.SETTING_LABELS),
    ];
    for (const s of produced) for (const re of BANNED) expect(s, `"${s}" matches ${re}`).not.toMatch(re);
  });

  it('never uses a middle dot or an emoji in UI text (DESIGN.md: drawn dividers only)', () => {
    const produced = [
      ...copy.pillSegments({ listings: 60, products: 47, twinGroups: 6, maxBrandTaxDollars: 23, pages: [1] }),
      copy.pillNoTwins(3),
      copy.imageReadsLine({ 'a.example': 1, 'b.example': 2 }),
    ].join(' ');
    expect(produced).not.toMatch(/·/);
    expect(produced).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('writes the pill the way SPEC section 3 and AC-F4.1 do', () => {
    const s: ScanSummary = { listings: 60, products: 47, twinGroups: 6, maxBrandTaxDollars: 23, pages: [1] };
    expect(copy.pillSegments(s)).toEqual([
      '60 listings → 47 products',
      '6 twin groups',
      'up to $23 brand tax',
    ]);
    expect(copy.pillAccessibleName(s)).toBe('60 listings, 47 products, 6 twin groups, up to $23 brand tax');
    expect(copy.pillSegments({ ...s, listings: 120, products: 71, twinGroups: 9, pages: [1, 2] })[0]).toBe(
      '120 listings across 2 pages → 71 products',
    );
    expect(copy.pillSegments({ ...s, maxBrandTaxDollars: null })).toHaveLength(2);
    expect(copy.pillSegments({ ...s, listings: 1, products: 1, twinGroups: 1 })).toEqual([
      '1 listing → 1 product',
      '1 twin group',
      'up to $23 brand tax',
    ]);
  });

  it('writes the fold card, tag and warning the way SPEC F6 does', () => {
    expect(copy.foldHeader(5)).toBe('These 5 listings use the same photo');
    expect(copy.badgeLabel('A', 5)).toBe('Twin A ×5');
    expect(copy.brandTaxTag(23, false)).toBe('Brand tax +$23.00');
    expect(copy.brandTaxTag(2, true)).toBe('Brand tax +$2.00 per unit');
    expect(copy.fewReviewsNote(14203)).toBe(
      'Few reviews. Uses the same photo as a listing with 14,203 reviews.',
    );
    expect(copy.pillNoTwins(60)).toBe('60 listings, no shared photos on this page');
    expect(copy.pillScanning(24, 60)).toBe('Checking 60 photos… 24/60');
    expect(copy.lensReadout(996)).toBe('99.6%');
    expect(copy.lensReadout(1000)).toBe('100%');
    expect(copy.lensDiffering(4)).toBe('0.4% of pixels differ');
  });

  it('says what the network counter measured and nothing it did not', () => {
    expect(copy.imageReadsLine({ 'm.media-amazon.com': 184 })).toBe(
      '184 image reads this session, all from m.media-amazon.com.',
    );
    expect(copy.imageReadsLine({})).toBe('No image reads this session.');
    expect(copy.PRIVACY_TITLE).toBe('Nothing leaves your device.');
    // Honest wording (SPEC section 4): never "0 requests" or "no network".
    for (const s of stringsOf(copy)) {
      expect(s).not.toMatch(/0 requests|no network|zero requests|offline/i);
    }
  });
});

describe('network policy (AC-X.2, SPEC section 10)', () => {
  const NETWORK_API = /\b(fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)/;
  const code = SOURCE.filter((f) => /\.(tsx?)$/.test(f));

  it('calls the network only from the thumbnail reader and its one fetch binding', () => {
    const users = code.filter((f) =>
      NETWORK_API.test(
        text(f)
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, ''),
      ),
    );
    expect(users.map(rel)).toEqual(['src/hasher/browserHasher.ts', 'src/hasher/fetchPixels.ts']);
  });

  it('reaches fetch only through readImage, which checks the allowlist first', () => {
    const src = text(join(ROOT, 'src/hasher/browserHasher.ts'));
    expect(src).toContain('readImage(');
    const reader = text(join(ROOT, 'src/hasher/fetchPixels.ts'));
    expect(reader.indexOf('checkImageUrl(')).toBeGreaterThan(-1);
    expect(reader.indexOf('checkImageUrl(')).toBeLessThan(reader.indexOf('deps.fetch('));
  });

  it('loads no remote script, stylesheet, font or frame', () => {
    for (const f of SOURCE.filter((p) => p.endsWith('.html'))) {
      expect(text(f), rel(f)).not.toMatch(/<(script|link|iframe|img)[^>]+(src|href)=["']https?:/i);
    }
    for (const f of SOURCE.filter((p) => p.endsWith('.css'))) {
      expect(text(f), rel(f)).not.toMatch(/url\(\s*['"]?https?:/i);
      expect(text(f), rel(f)).not.toMatch(/@import\s+(url\()?['"]https?:/i);
    }
  });

  it('mentions only expected hosts in source', () => {
    const allowed = new Set([
      'www.amazon.com',
      'www.walmart.com',
      'm.media-amazon.com',
      'images-na.ssl-images-amazon.com',
      'i5.walmartimages.com',
      'github.com',
      'localhost',
    ]);
    const unexpected: string[] = [];
    for (const f of code) {
      const t = text(f)
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of t.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        const host = (m[1] as string).toLowerCase();
        if (!allowed.has(host) && host !== 'www.w3.org') unexpected.push(`${rel(f)} -> ${host}`);
      }
    }
    expect(unexpected).toEqual([]);
  });

  it('has no analytics, telemetry or remote-config vocabulary in dependencies', () => {
    const pkg = JSON.parse(text(join(ROOT, 'package.json'))) as { dependencies: Record<string, string> };
    const banned =
      /sentry|posthog|mixpanel|segment|amplitude|datadog|bugsnag|analytics|telemetry|firebase|gtag|plausible/i;
    expect(Object.keys(pkg.dependencies).filter((d) => banned.test(d))).toEqual([]);
  });

  it('pins every dependency to an exact version', () => {
    const pkg = JSON.parse(text(join(ROOT, 'package.json'))) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    for (const [name, range] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      expect(range, name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe('overlay safety (AC-X.3)', () => {
  const overlay = SOURCE.filter(
    (f) => /src\/(overlay|content|ui)\//.test(f.replaceAll('\\', '/')) || f.includes('entrypoints'),
  );

  it('never sets innerHTML, outerHTML, insertAdjacentHTML or dangerouslySetInnerHTML', () => {
    for (const f of overlay.filter((p) => /\.tsx?$/.test(p))) {
      expect(text(f), rel(f)).not.toMatch(
        /innerHTML|outerHTML|insertAdjacentHTML|dangerouslySetInnerHTML|document\.write/,
      );
    }
  });

  it('never evaluates strings as code', () => {
    for (const f of SOURCE.filter((p) => /\.tsx?$/.test(p))) {
      expect(text(f), rel(f)).not.toMatch(/\beval\s*\(|new Function\s*\(/);
    }
  });

  it('never logs page data: console is off everywhere but the single diagnostic helper', () => {
    const users = SOURCE.filter((f) => /\bconsole\./.test(text(f)));
    expect(users.map(rel)).toEqual(['src/util/log.ts']);
  });
});

describe('engine boundary (web app reuse)', () => {
  const entry = join(ROOT, 'src/core/index.ts');

  function reachable(file: string, seen = new Set<string>()): Set<string> {
    if (seen.has(file)) return seen;
    seen.add(file);
    const src = text(file);
    for (const m of src.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
      const base = resolve(dirname(file), m[1] as string);
      const candidates = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')];
      const found = candidates.find((c) => existsSync(c));
      if (found) reachable(found, seen);
    }
    return seen;
  }

  const files = [...reachable(entry)];

  it('reaches a meaningful part of the codebase from one entry module', () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files.map(rel)).toContain('src/core/cluster/groups.ts');
    expect(files.map(rel)).toContain('src/adapters/amazon/index.ts');
    expect(files.map(rel)).toContain('src/background/coordinator.ts');
  });

  it('touches no chrome.*, browser.*, wxt or extension-only API', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const code = text(f)
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      if (/\b(chrome|browser)\s*\./.test(code)) offenders.push(`${rel(f)} uses chrome/browser`);
      if (/from\s+['"](wxt|@wxt-dev|@webext-core)/.test(code))
        offenders.push(`${rel(f)} imports an extension library`);
      if (/import\.meta\.env/.test(code)) offenders.push(`${rel(f)} reads import.meta.env`);
      if (/from\s+['"]react/.test(code)) offenders.push(`${rel(f)} imports React`);
    }
    expect(offenders).toEqual([]);
  });

  it('exports what the web app needs', async () => {
    const engine = await import('../../src/core/index');
    for (const name of [
      'cluster',
      'hashImage',
      'readPage',
      'scanDocument',
      'createCoordinator',
      'createHashService',
      'checkImageUrl',
      'pillReducer',
      'overlayReducer',
    ]) {
      expect(engine, name).toHaveProperty(name);
    }
  });
});
