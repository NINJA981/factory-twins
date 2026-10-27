// Builds every generated asset of the site from the repo's fixtures and the real engine:
//   public/sample/        bundled sample results pages + downsized images (the /app "sample" button)
//   public/landing/t/     AVIF stills for the hero demo and the proof stack
//   src/demo/demo.json    the hero demo: 12 listings, the engine's grouping of exactly those 12, and the
//                         Proof lens numbers (computed with the engine's pixelDiff, never typed)
//   public/icons/         PWA and favicon icons
// Run with `pnpm assets`. Deterministic; commit the output.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { Window } from 'happy-dom';
import sharp from 'sharp';
import {
  ADAPTERS,
  cluster,
  foldCardView,
  hashImage,
  pixelDiff,
  readPage,
  type ImageHashes,
  type Listing,
  type RgbaImage,
} from '@engine';
import { lensDiffering, lensReadout, formatPrice } from '@copy';
import { esc } from '../src/shared/dom';
import { foldCardHtml, gridHtml, pillHtml, priceText } from '../src/shared/templates';

const SITE = resolve(import.meta.dirname, '..');
const FIX = resolve(SITE, '../tests/fixtures/demo/laptop-stand');
const SAMPLE = join(SITE, 'public/sample');
const LANDING = join(SITE, 'public/landing/t');
const HREF = 'https://www.amazon.com/s?k=laptop+stand';

mkdirSync(join(SAMPLE, 'img'), { recursive: true });
mkdirSync(LANDING, { recursive: true });
mkdirSync(join(SITE, 'public/icons'), { recursive: true });

async function rgba(input: string | Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
}

function readFixture(file: string): Listing[] {
  const win = new Window();
  win.document.write(readFileSync(join(FIX, file), 'utf8'));
  const url = file === 'page2.html' ? `${HREF}&page=2` : HREF;
  const r = readPage(ADAPTERS['amazon-us'], win.document as unknown as Document, url);
  if (!r.ok) throw new Error(`fixture ${file}: ${r.reason}`);
  return r.listings;
}

const base = (u: string) => basename(new URL(u).pathname);

async function main() {
  // 1. Sample pages: the fixture HTML verbatim (minus the fixture banner), images downsized to 320 px.
  for (const [src, dst] of [
    ['page.html', 'page-1.html'],
    ['page2.html', 'page-2.html'],
  ] as const) {
    const html = readFileSync(join(FIX, src), 'utf8').replace(
      /<div style="position:fixed[^>]*>Demo page[^<]*<\/div>/,
      '',
    );
    writeFileSync(join(SAMPLE, dst), html);
  }
  const imgDir = join(FIX, 'img');
  const files = readdirSync(imgDir).filter((f) => f.endsWith('.jpg'));
  for (const f of files) {
    await sharp(join(imgDir, f))
      .resize(320, 320, { fit: 'inside' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(join(SAMPLE, 'img', f));
  }
  console.log(`sample: ${files.length} images, 2 pages`);

  // 2. Verify the shipped (downsized) images still group exactly as labelled.
  const page1 = readFixture('page.html');
  const labels = JSON.parse(readFileSync(join(FIX, 'labels.json'), 'utf8')) as { groups: string[][] };
  const hashes: Record<string, ImageHashes> = {};
  for (const l of page1) hashes[l.id] = hashImage(await rgba(join(SAMPLE, 'img', base(l.imageUrl))));
  const got = cluster({ listings: page1, hashes }).groups.map((g) => [...g.memberIds].sort().join(','));
  const want = labels.groups.map((g) => [...g].sort().join(','));
  const same = got.length === want.length && want.every((w) => got.includes(w));
  console.log(
    `sample grouping matches labels.json: ${same} (${got.length} groups found, ${want.length} labelled)`,
  );
  if (!same) throw new Error('downsized sample images no longer group as labelled');

  // 3. Hero demo: group A (the SPEC section 12 ladder) plus 7 listings with no twin, 12 tiles.
  const inGroup = new Set(labels.groups.flat());
  const groupA = labels.groups[0] as string[];
  const byId = new Map(page1.map((l) => [l.id, l]));
  const distractors = page1.filter((l) => !inGroup.has(l.id)).slice(0, 7);
  // Grid slots where the twins sit, scattered like a real results page.
  const twinSlots = [0, 1, 2, 4, 5];
  const twins = groupA.map((id) => byId.get(id) as Listing).sort((a, b) => a.position - b.position);
  const picked: Listing[] = [];
  let ti = 0;
  let di = 0;
  for (let slot = 0; slot < 12; slot++) {
    picked.push(twinSlots.includes(slot) ? (twins[ti++] as Listing) : (distractors[di++] as Listing));
  }
  const listings: Listing[] = [];
  const demoHashes: Record<string, ImageHashes> = {};
  const pixels = new Map<string, RgbaImage>();
  for (const [i, l] of picked.entries()) {
    const out = `${l.id.toLowerCase()}.avif`;
    await sharp(join(imgDir, base(l.imageUrl)))
      .resize(360, 360, { fit: 'inside' })
      .flatten({ background: '#ffffff' })
      .avif({ quality: 52, effort: 6 })
      .toFile(join(LANDING, out));
    const px = await rgba(join(LANDING, out));
    pixels.set(l.id, px);
    demoHashes[l.id] = hashImage(px);
    listings.push({ ...l, position: i, page: 1, imageUrl: `landing/t/${out}` });
  }
  const result = cluster({ listings, hashes: demoHashes });
  const g = result.groups[0];
  if (result.groups.length !== 1 || !g || g.memberIds.length !== 5 || !g.brandTax)
    throw new Error(
      `hero demo must hold exactly one priced group of 5, got ${JSON.stringify(result.groups)}`,
    );
  const tax = g.brandTax;

  // Proof lens numbers for the demo: lowest vs highest rung (a twin pair), and a twin vs a non-twin.
  const other = distractors[0] as Listing;
  const twinPair = pixelDiff(pixels.get(tax.lowId) as RgbaImage, pixels.get(tax.highId) as RgbaImage);
  const differentPair = pixelDiff(pixels.get(tax.lowId) as RgbaImage, pixels.get(other.id) as RgbaImage);
  const demo = {
    note: 'Generated by scripts/prepare-assets.ts with the real engine from ../src/core. Do not edit by hand.',
    sourceFixture: 'tests/fixtures/demo/laptop-stand',
    listings,
    result,
    lens: {
      twin: { a: tax.lowId, b: tax.highId, ...twinPair },
      different: { a: tax.lowId, b: other.id, ...differentPair },
    },
  };
  writeFileSync(join(SITE, 'src/demo/demo.json'), JSON.stringify(demo, null, 1) + '\n');
  console.log(
    `demo: group ${g.letter} x${g.memberIds.length}, brand tax ${tax.amount}, twin pair ${twinPair.identicalTenths / 10}% identical, different pair ${differentPair.identicalTenths / 10}%`,
  );

  // 3b. A second, different group for the "brand tax" beat: group B of the full page, labelled B.
  const groupB = labels.groups[1] as string[];
  const bListings: Listing[] = [];
  const bHashes: Record<string, ImageHashes> = {};
  for (const [i, id] of groupB.entries()) {
    const l = byId.get(id) as Listing;
    const out = `${l.id.toLowerCase()}.avif`;
    await sharp(join(imgDir, base(l.imageUrl)))
      .resize(360, 360, { fit: 'inside' })
      .flatten({ background: '#ffffff' })
      .avif({ quality: 52, effort: 6 })
      .toFile(join(LANDING, out));
    bHashes[l.id] = hashImage(await rgba(join(LANDING, out)));
    bListings.push({ ...l, position: i, imageUrl: `landing/t/${out}` });
  }
  const bResult = cluster({
    listings: bListings,
    hashes: bHashes,
    previousLetters: Object.fromEntries(groupB.map((id) => [id, 'B'])),
  });
  const bGroup = bResult.groups[0];
  if (!bGroup || bGroup.letter !== 'B' || bGroup.memberIds.length !== groupB.length)
    throw new Error('group B demo did not reproduce');
  const bView = foldCardView(bGroup, Object.fromEntries(bListings.map((l) => [l.id, l])), 1);
  if (!bView) throw new Error('no fold view for group B');

  // 3c. Pill crops with real numbers: the full 60-listing page, and a page where nothing repeats.
  const pageResult = cluster({ listings: page1, hashes });
  const quiet = page1.filter((l) => !inGroup.has(l.id)).slice(0, 8);
  const quietResult = cluster({ listings: quiet, hashes });
  console.log(
    'page summary',
    JSON.stringify(pageResult.summary),
    'quiet',
    JSON.stringify(quietResult.summary),
  );
  if (quietResult.summary.twinGroups !== 0) throw new Error('quiet page should have no twin groups');

  // 3d. Static fragments for index.html. The default state is the folded end state (JS off), the head
  // script flips it to the unfolded grid before first paint.
  const twinImg = (id: string, i: number) => {
    const l = listings.find((x) => x.id === id) as Listing;
    return `<figure class="stack-card" style="--i:${i}" data-id="${esc(id)}"><img src="${esc(l.imageUrl)}" alt="Photo from the ${esc(priceText(l))} listing" width="360" height="360" decoding="async" loading="lazy"></figure>`;
  };
  const otherL = listings.find((x) => x.id === other.id) as Listing;
  const stack = `<div class="stack" data-state="fan" data-mode="twins">${g.memberIds.map((id, i) => twinImg(id, i)).join('')}<figure class="stack-card stack-other" style="--i:5" data-id="${esc(other.id)}"><img src="${esc(otherL.imageUrl)}" alt="A different product photo" width="360" height="360" decoding="async" loading="lazy"></figure></div>`;
  const readoutHtml = (
    r: { identicalTenths: number; differingTenths: number; differing: number },
    id: string,
    hidden: boolean,
  ) =>
    `<div class="stack-readout" id="${id}"${hidden ? ' hidden' : ''}><p class="readout"><span class="readout-num">${esc(lensReadout(r.identicalTenths))}</span> <span class="readout-word">identical</span></p><p class="readout-sub">${esc(r.differing === 0 ? 'No pixel differs.' : lensDiffering(r.differingTenths))}</p></div>`;
  const fragments = {
    note: 'Generated by scripts/prepare-assets.ts. Do not edit by hand.',
    grid: gridHtml(
      { listings, result },
      { imgAttrs: (_l, i) => (i < 4 ? 'fetchpriority="high"' : '') },
    ).replace(/^/, ''),
    pill: pillHtml(result.summary, { hasGroups: true, folded: false }),
    cardB: foldCardHtml(bView, { shortcuts: false }),
    pillPage: pillHtml(pageResult.summary, { hasGroups: true, dismissable: false, keycaps: false }).replace(
      'data-act="rings"',
      'data-static',
    ),
    pillQuiet: pillHtml(quietResult.summary, { hasGroups: false, dismissable: false, keycaps: false }),
    stack,
    readoutTwin: readoutHtml(twinPair, 'readout-twin', false),
    readoutDifferent: readoutHtml(differentPair, 'readout-different', true),
  };
  writeFileSync(join(SITE, 'src/demo/fragments.json'), JSON.stringify(fragments, null, 1) + '\n');
  const taxA = formatPrice(tax.amount);
  console.log(
    `fragments written (hero brand tax ${taxA}, group B tax ${bView.brandTax ? formatPrice(bView.brandTax.amount) : 'none'})`,
  );

  // 4. Icons: the twin glyph (two overlapping frames), paper-coloured on Berry Ink.
  const berry = '#a02262';
  const paper = '#fbf9fa';
  const icon = (pad: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${berry}"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 24})" fill="none" stroke="${paper}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
<rect x="2.5" y="2.5" width="13" height="13" rx="3"/><rect x="8.5" y="8.5" width="13" height="13" rx="3" fill="${berry}"/></g></svg>`;
  for (const [name, size, pad] of [
    ['icon-192.png', 192, 56],
    ['icon-512.png', 512, 96],
    ['apple-touch-icon.png', 180, 52],
    ['icon-maskable-512.png', 512, 150],
  ] as const) {
    await sharp(Buffer.from(icon(pad)))
      .resize(size, size)
      .png()
      .toFile(join(SITE, 'public/icons', name));
  }
  writeFileSync(
    join(SITE, 'public/icons/favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${berry}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="13" height="13" rx="3"/><rect x="8.5" y="8.5" width="13" height="13" rx="3" fill="${paper}"/></svg>\n`,
  );
  console.log('icons written');
}

await main();
