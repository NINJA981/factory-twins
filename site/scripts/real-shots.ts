// Converts the extension's own screenshots (../docs/screenshots, written by the root e2e suite with
// FT_SHOTS=1) into the AVIF files the landing page shows as "the real product". Nothing is retouched:
// the files are resized only when wider than the slot, then re-encoded. Run: pnpm shots:real
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const src = join(root, '..', 'docs', 'screenshots');
const out = join(root, 'public', 'landing', 'real');
mkdirSync(out, { recursive: true });

// [source file, output name]. 768 is the desktop slot (shown at about 600 to 740 px), 375 the phone slot.
const jobs: [string, string][] = [];
for (const scheme of ['light', 'dark'])
  for (const w of ['768', '375']) jobs.push([`03b-card-${w}-${scheme}.png`, `card-${w}-${scheme}.avif`]);

for (const [from, to] of jobs) {
  const file = join(src, from);
  if (!existsSync(file))
    throw new Error(`missing ${file}: run FT_SHOTS=1 pnpm test:e2e screenshots in the repo root`);
  const img = sharp(file);
  const meta = await img.metadata();
  await img.avif({ quality: 62, effort: 6 }).toFile(join(out, to));
  console.log(`${to}: ${meta.width}x${meta.height}, ${(statSync(join(out, to)).size / 1024).toFixed(1)} kB`);
}
