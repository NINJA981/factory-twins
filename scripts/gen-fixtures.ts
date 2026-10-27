// Regenerates the committed fixture corpus (ADR, fixture strategy). Run: pnpm fixtures
//
//   tests/fixtures/amazon/<slug>/  and  tests/fixtures/walmart/<slug>/
//       page.html      store-shaped results DOM (a reconstruction, see PROVENANCE.md)
//       hashes.json    per-listing hashes from the production hash code over synthetic photos
//       labels.json    which listings share a photo (twin groups) and which are variants
//       PROVENANCE.md  what the fixture is and is not
//   tests/fixtures/demo/laptop-stand/   the e2e demo page and its (synthetic) images
//
// No store photo is read or written anywhere. Output is deterministic: same seeds, same files.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THRESHOLDS } from '../src/core/constants';
import { colorDistance } from '../src/core/hash/color';
import { hamming } from '../src/core/hash/hamming';
import { hashImage } from '../src/core/hash/index';
import type { ImageHashes } from '../src/core/types';
import { renderAmazonPage, renderWalmartPage, placeholderImageUrl } from './lib/fixtureHtml';
import { CATEGORIES, buildPage, type ListingSpec, type PageSpec, type Store } from './lib/fixtureSpec';
import {
  decodeRgba,
  encodeOriginal,
  encodeTwin,
  mulberry32,
  randomTransform,
  renderPhoto,
} from './lib/synth';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(root, 'tests', 'fixtures');
const GENERATED_ON = '2026-10-27';

function write(path: string, content: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Encodes a listing's displayed photo: the source photo as uploaded, or a re-upload of it. */
export async function displayedPhoto(l: ListingSpec, rnd: () => number): Promise<Buffer> {
  const png = await renderPhoto({ seed: l.photoSeed, silhouette: silhouetteOf(l), hueShift: l.hueShift });
  return l.reupload ? encodeTwin(png, randomTransform(rnd)) : encodeOriginal(png);
}

const silhouettes = new Map<string, PageSpec['category']['silhouette']>();
function silhouetteOf(l: ListingSpec): PageSpec['category']['silhouette'] {
  return silhouettes.get(l.id) as PageSpec['category']['silhouette'];
}

async function hashesFor(
  spec: PageSpec,
  onImage?: (l: ListingSpec, jpeg: Buffer) => void,
): Promise<Record<string, ImageHashes>> {
  const rnd = mulberry32(spec.seed ^ 0x9e3779b9);
  const out: Record<string, ImageHashes> = {};
  for (const l of spec.listings) {
    silhouettes.set(l.id, spec.category.silhouette);
    const jpeg = await displayedPhoto(l, rnd);
    onImage?.(l, jpeg);
    out[l.id] = hashImage(await decodeRgba(jpeg));
  }
  return out;
}

function provenance(spec: PageSpec): string {
  const host = spec.store === 'amazon-us' ? 'Amazon.com' : 'Walmart.com';
  return `# Fixture: ${spec.store} / ${spec.slug}

| | |
|---|---|
| Query | \`${spec.query}\` (page ${spec.page}) |
| Store shape | ${host} search results, adapter version 1 selectors |
| Generated | ${GENERATED_ON} by \`scripts/gen-fixtures.ts\` (seed ${spec.seed}) |
| Listings | ${spec.listings.length} product tiles plus ${spec.widgets} non-product widgets${spec.store === 'walmart-us' ? ' (one carousel item)' : ''} |
| Twin groups | ${spec.groups.length} (${spec.groups.map((g) => g.length).join(', ') || 'none'} listings) |
| Variant families | ${spec.variantFamilies.length} |

## What this is

A **synthetic reconstruction**, not a capture of a live page. The DOM follows the structure the
${host} adapter reads (tile container, title, byline, price, rating, review count, sponsored label,
lazy image), surrounded by the clutter that real pages carry (widgets, carousels, strike prices,
unit prices, price ranges, listings without a price). Brand names, titles, prices, ratings and
review counts are invented from seeded templates and are not real listings.

\`hashes.json\` holds the output of the production hash code (\`hashImage\`) over seeded synthetic
photos. Listings with the same \`photo\` share a source image; re-uploads are JPEG-recompressed
(quality 60 to 95), rescaled (0.5x to 2x), border-cropped (up to 3%) and brightness-shifted (about
5%). Image URLs are placeholders that keep the store's host and path shape. **No store photo, logo or
text is in this directory.**

## What it does not prove

It tests the pipeline (adapter, hashing, clustering, evidence) against known labels. It cannot show
that the selectors match today's live ${host} markup or how often real result pages contain twins.
A maintainer capture with \`scripts/capture-fixture.ts\` (not written yet) is still needed for that;
see HANDOFF.md.
`;
}

async function writeFixture(spec: PageSpec): Promise<void> {
  const dir = join(fixtures, spec.store === 'amazon-us' ? 'amazon' : 'walmart', spec.slug);
  const html =
    spec.store === 'amazon-us'
      ? renderAmazonPage(spec, placeholderImageUrl)
      : renderWalmartPage(spec, placeholderImageUrl);
  const hashes = await hashesFor(spec);
  const labels = {
    store: spec.store,
    query: spec.query,
    page: spec.page,
    tiles: spec.listings.length,
    withPrice: spec.listings.filter((l) => l.price != null).length,
    widgets: spec.widgets,
    groups: spec.groups,
    variantFamilies: spec.variantFamilies,
  };
  write(join(dir, 'page.html'), html);
  write(join(dir, 'hashes.json'), `${JSON.stringify(hashes)}\n`);
  write(join(dir, 'labels.json'), `${JSON.stringify(labels, null, 1)}\n`);
  write(join(dir, 'PROVENANCE.md'), provenance(spec));
  console.log(`${spec.store}/${spec.slug}: ${spec.listings.length} tiles, ${spec.groups.length} groups`);
}

interface Plan {
  slug: string;
  tiles: number;
  groups: number[];
  variants: number;
}

const AMAZON_PLAN: Plan[] = [
  { slug: 'laptop-stand', tiles: 60, groups: [5, 4, 3, 3, 2, 2], variants: 2 },
  { slug: 'led-strip-lights', tiles: 56, groups: [6, 4, 3, 2], variants: 2 },
  { slug: 'phone-tripod', tiles: 52, groups: [4, 3, 3, 2], variants: 1 },
  { slug: 'silicone-spatula-set', tiles: 48, groups: [3, 2, 2], variants: 2 },
  { slug: 'dog-poop-bags', tiles: 44, groups: [5, 2], variants: 1 },
  { slug: 'cable-organizer', tiles: 60, groups: [4, 4, 3, 2, 2], variants: 2 },
  { slug: 'ring-light', tiles: 40, groups: [3, 2], variants: 1 },
  { slug: 'acrylic-paint-set', tiles: 50, groups: [3, 3, 2], variants: 2 },
  { slug: 'shower-caddy', tiles: 54, groups: [4, 2, 2], variants: 1 },
  { slug: 'kitchen-scale', tiles: 46, groups: [], variants: 1 },
  { slug: 'usb-c-hub', tiles: 58, groups: [5, 3, 2, 2], variants: 2 },
  { slug: 'plant-pots', tiles: 36, groups: [2], variants: 1 },
];

const WALMART_PLAN: Plan[] = [
  { slug: 'laptop-stand', tiles: 40, groups: [3, 3, 2], variants: 1 },
  { slug: 'led-strip-lights', tiles: 40, groups: [4, 2], variants: 1 },
  { slug: 'phone-tripod', tiles: 36, groups: [3, 2], variants: 1 },
  { slug: 'kitchen-scale', tiles: 40, groups: [2, 2], variants: 1 },
  { slug: 'usb-c-hub', tiles: 44, groups: [4, 3, 2], variants: 2 },
  { slug: 'shower-caddy', tiles: 32, groups: [], variants: 1 },
];

function planned(store: Store, plan: Plan, index: number): PageSpec {
  const category = CATEGORIES.find((c) => c.slug === plan.slug);
  if (!category) throw new Error(`Unknown category ${plan.slug}`);
  return buildPage({
    store,
    category,
    slug: plan.slug,
    seed: (store === 'amazon-us' ? 4100 : 8100) + index * 17,
    tiles: plan.tiles,
    groupSizes: plan.groups,
    variantFamilies: plan.variants,
  });
}

/**
 * True when the page's hashes give exactly the labelled twin groups with some margin: no near miss
 * between different products, and every labelled group stays connected through clearly-inside edges.
 * The margin keeps browser decoding (slightly different pixels than sharp) from tipping a pair.
 */
function demoIsClean(spec: PageSpec, hashes: Record<string, ImageHashes>): boolean {
  const t = THRESHOLDS.standard;
  const dist = (x: string, y: string) => {
    const a = hashes[x] as ImageHashes;
    const b = hashes[y] as ImageHashes;
    return { p: hamming(a.phash, b.phash), d: hamming(a.dhash, b.dhash), c: colorDistance(a.color, b.color) };
  };
  const groupOf = new Map<string, number>();
  spec.groups.forEach((g, gi) => g.forEach((id) => groupOf.set(id, gi)));
  const ids = spec.listings.map((l) => l.id);
  const inside = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const x = ids[i] as string;
      const y = ids[j] as string;
      const { p, d, c } = dist(x, y);
      const sameGroup = groupOf.has(x) && groupOf.get(x) === groupOf.get(y);
      if (!sameGroup && p <= t.phash + 2 && d <= t.dhash + 2 && c <= t.color + 0.02) return false;
      if (sameGroup && p <= t.phash - 1 && d <= t.dhash - 2 && c <= t.color - 0.01) {
        inside.set(x, [...(inside.get(x) ?? []), y]);
        inside.set(y, [...(inside.get(y) ?? []), x]);
      }
    }
  }
  return spec.groups.every((g) => {
    const seen = new Set<string>([g[0] as string]);
    const queue = [g[0] as string];
    while (queue.length > 0) {
      for (const n of inside.get(queue.pop() as string) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    return seen.size === g.length;
  });
}

/** The e2e demo page: SPEC §12's "laptop stand" results with made-up listings. */
async function writeDemo(): Promise<void> {
  const category = CATEGORIES.find((c) => c.slug === 'laptop-stand');
  if (!category) throw new Error('laptop-stand category missing');
  const attempt = async (seed: number) => {
    const spec = buildPage({
      store: 'amazon-us',
      category,
      slug: 'laptop-stand',
      seed,
      tiles: 60,
      groupSizes: [5, 4, 3, 3, 2, 2],
      variantFamilies: 0,
    });
    const byId = new Map(spec.listings.map((l) => [l.id, l]));
    // Twin A's ladder from the demo script, so the recorded numbers are on the page.
    const ladder = [11.99, 13.49, 15.99, 19.99, 34.99];
    const reviews = [3918, 1204, 87, 640, 212];
    const brands = ['Zexmte', 'Lumora', 'Vantix', 'Oriant', 'ProBrand'];
    (spec.groups[0] as string[]).forEach((id, i) => {
      const l = byId.get(id) as ListingSpec;
      Object.assign(l, {
        price: ladder[i],
        priceRange: null,
        strikePrice: null,
        unitPriceText: null,
        rating: i === 4 ? 4.4 : 4.5,
        reviews: reviews[i],
        brand: brands[i],
        brandStyle: 'heading',
        sponsored: false,
      });
      l.title = `${brands[i]} Adjustable Laptop Stand for Desk, Ergonomic Aluminum Riser`;
    });
    // Keep every other group's spread small so Twin A holds the largest brand tax.
    spec.groups.slice(1).forEach((g) =>
      g.forEach((id, i) => {
        const l = byId.get(id) as ListingSpec;
        l.price = Math.round((14 + i * 2.5) * 100) / 100;
        l.priceRange = null;
      }),
    );
    const images = new Map<string, Buffer>();
    const hashes = await hashesFor(spec, (l, jpeg) => images.set(l.imageId, jpeg));
    return { spec, hashes, images };
  };
  // The page must show exactly the labelled groups: pick the first seed whose synthetic photos have
  // no accidental near-duplicate between different products (and no split twin group).
  let seed = 2026;
  let built = await attempt(seed);
  while (!demoIsClean(built.spec, built.hashes)) {
    seed++;
    if (seed > 2026 + 40) throw new Error('No clean demo seed found');
    built = await attempt(seed);
  }
  const { spec, hashes, images } = built;
  const dir = join(fixtures, 'demo', 'laptop-stand');
  rmSync(join(dir, 'img'), { recursive: true, force: true });
  for (const [imageId, jpeg] of images) write(join(dir, 'img', `${imageId}.jpg`), jpeg);
  const html = renderAmazonPage(spec, (l) => `http://localhost:4817/img/${l.imageId}.jpg`).replace(
    '<body>',
    '<body><div style="position:fixed;top:8px;left:8px;z-index:5;padding:2px 8px;background:#fff;border:1px solid #888;font:12px sans-serif">Demo page with made-up listings</div>',
  );
  // Page 2 of the same query: new ASINs and brand names, the very same photos, so twin groups span pages.
  let page2 = html.replace(/B0([A-Z0-9]{8})/g, 'B1$1');
  for (const brand of new Set(spec.listings.map((l) => l.brand)))
    page2 = page2.split(brand).join(`${brand}Q`);
  write(join(dir, 'page2.html'), page2);
  write(join(dir, 'page.html'), html);
  write(join(dir, 'hashes.json'), `${JSON.stringify(hashes)}\n`);
  write(
    join(dir, 'labels.json'),
    `${JSON.stringify({ store: spec.store, query: spec.query, tiles: spec.listings.length, groups: spec.groups, variantFamilies: [] }, null, 1)}\n`,
  );
  write(
    join(dir, 'PROVENANCE.md'),
    `# Demo page: laptop stand\n\nGenerated ${GENERATED_ON} by \`scripts/gen-fixtures.ts\` (seed ${seed}). Sixty made-up listings in an Amazon-shaped results grid, with synthetic product images (seeded shapes, not photographs). Twin A carries the price ladder from SPEC section 12; every price, rating and review count here is illustrative. Served by \`scripts/serve-fixtures.mjs\` for the e2e tests; the page is labelled "Demo page with made-up listings". No store logo, name or photo appears.\n`,
  );
  console.log(`demo/laptop-stand: ${spec.listings.length} tiles, ${spec.groups.length} groups`);
}

async function main(): Promise<void> {
  let i = 0;
  for (const plan of AMAZON_PLAN) await writeFixture(planned('amazon-us', plan, i++));
  i = 0;
  for (const plan of WALMART_PLAN) await writeFixture(planned('walmart-us', plan, i++));
  await writeDemo();
}

await main();
