// Builds the self-hosted extension fonts in public/fonts from the Fontsource packages (DESIGN.md
// › Typography › Extension font shipping). Run: pnpm fonts. Output is committed.
//  - Rethink Sans Variable, latin, wght axis: copied as published.
//  - Bricolage Grotesque Variable, latin "standard" axes file: wdth pinned to 85, wght and opsz
//    narrowed to the 600–700 the type scale uses, opsz kept, glyphs subset to printable Latin-1 plus the few symbols the UI uses.
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public', 'fonts');
mkdirSync(out, { recursive: true });

const rethinkDir = dirname(require.resolve('@fontsource-variable/rethink-sans/package.json'));
const bricolageDir = dirname(require.resolve('@fontsource-variable/bricolage-grotesque/package.json'));

copyFileSync(
  join(rethinkDir, 'files', 'rethink-sans-latin-wght-normal.woff2'),
  join(out, 'rethink-sans-latin-wght.woff2'),
);

let text = '';
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCharCode(c);
for (let c = 0xa0; c <= 0xff; c++) text += String.fromCharCode(c);
text += '×→…–—‘’“”₍₎−';

const source = readFileSync(join(bricolageDir, 'files', 'bricolage-grotesque-latin-standard-normal.woff2'));
const subset = await subsetFont(source, text, {
  targetFormat: 'woff2',
  variationAxes: { wdth: 85, wght: { min: 600, max: 700 } },
});
writeFileSync(join(out, 'bricolage-grotesque-wdth85-latin.woff2'), subset);

for (const f of ['rethink-sans-latin-wght.woff2', 'bricolage-grotesque-wdth85-latin.woff2']) {
  console.log(`${f}: ${(statSync(join(out, f)).size / 1024).toFixed(1)} KB`);
}
