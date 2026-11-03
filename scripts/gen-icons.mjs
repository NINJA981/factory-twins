// Extension icons from the twin glyph (the same mark as site/public/icons/favicon.svg).
// Writes public/icon/{16,32,48,128}.png, which WXT puts in the manifest's `icons`.
// The 128 px icon follows the Chrome Web Store rule: 96 px of art with 16 px of transparent padding.
// Run: node scripts/gen-icons.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const svg = readFileSync(join(root, 'site', 'public', 'icons', 'favicon.svg'));
const out = join(root, 'public', 'icon');
mkdirSync(out, { recursive: true });

// [output size, art size]: small sizes use almost the whole square so the glyph stays legible.
const sizes = [
  [16, 16],
  [32, 30],
  [48, 44],
  [128, 96],
];

for (const [size, art] of sizes) {
  const glyph = await sharp(svg, { density: 72 * (art / 24) * 4 })
    .resize(art, art)
    .png()
    .toBuffer();
  const pad = Math.floor((size - art) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: glyph, left: pad, top: pad }])
    .png()
    .toFile(join(out, `${size}.png`));
  console.log(`public/icon/${size}.png`);
}
