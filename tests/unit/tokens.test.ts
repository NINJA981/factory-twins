import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter, parse, wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';
import { parseFrontMatter, renderThemeCss, renderTokensCss } from '../../scripts/lib/designTokens';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('DESIGN.md tokens are wired into the CSS', () => {
  const tree = parseFrontMatter(read('DESIGN.md'));

  it('keeps src/styles/tokens.css and theme.css equal to what DESIGN.md generates (run `pnpm tokens`)', () => {
    expect(read('src/styles/tokens.css').replaceAll('\r\n', '\n')).toBe(renderTokensCss(tree));
    expect(read('src/styles/theme.css').replaceAll('\r\n', '\n')).toBe(renderThemeCss(tree));
  });

  it('declares tokens on :root and :host so they resolve inside shadow roots', () => {
    expect(read('src/styles/tokens.css')).toMatch(/:root,\s*:host\s*\{/);
  });

  it('has a dark set by attribute and by system preference', () => {
    const css = read('src/styles/tokens.css');
    expect(css).toMatch(/:root\[data-theme=["']dark["']\]/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  it('maps tokens into Tailwind v4 @theme with the default palette cleared', () => {
    const theme = read('src/styles/theme.css');
    expect(theme).toMatch(/@theme inline\s*\{/);
    expect(theme).toContain('--color-*: initial;');
    expect(theme).toContain('--color-accent: var(--accent);');
  });

  it('self-hosts fonts from Fontsource builds and imports nothing remote', () => {
    const fonts = read('src/styles/fonts.css');
    expect(fonts).toContain('/fonts/rethink-sans-latin-wght.woff2');
    expect(fonts).not.toMatch(/https?:/);
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies).toHaveProperty('@fontsource-variable/rethink-sans');
    expect(pkg.dependencies).toHaveProperty('@fontsource-variable/bricolage-grotesque');
  });

  it('uses no hard-coded colour in overlay or app CSS or in components (off-token values)', () => {
    const files = [
      'src/styles/overlay.css',
      'src/styles/overlay-base.css',
      'src/styles/tile.css',
      'src/styles/card.css',
      'src/styles/app.css',
      ...readdirSync('src/overlay').map((f) => `src/overlay/${f}`),
      ...readdirSync('src/ui').map((f) => `src/ui/${f}`),
    ];
    for (const f of files) {
      const text = read(f);
      expect(text, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(text, f).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/);
    }
  });
});

function block(css: string, startMarker: string): Record<string, string> {
  const start = css.indexOf(startMarker);
  if (start < 0) throw new Error(`missing ${startMarker}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const out: Record<string, string> = {};
  for (const m of css.slice(open + 1, end).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g))
    out[m[1] as string] = (m[2] as string).trim();
  return out;
}

describe('contrast of the token pairs the UI relies on (AC-F5.2)', () => {
  const css = read('src/styles/tokens.css');
  const light = block(css, ':root,');
  const dark = { ...light, ...block(css, ':root[data-theme="dark"]') };
  const toRgb = converter('rgb');
  const ratio = (set: Record<string, string>, a: string, b: string) => {
    const ca = parse(set[a] as string);
    const cb = parse(set[b] as string);
    if (!ca || !cb) throw new Error(`cannot parse ${a} or ${b}`);
    return wcagContrast(toRgb(ca), toRgb(cb));
  };

  for (const [name, set] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    describe(name, () => {
      it.each([
        ['text', 'bg', 4.5],
        ['text', 'surface', 4.5],
        ['text-muted', 'surface', 4.5],
        ['text-subtle', 'surface', 4.5],
        ['accent', 'bg', 4.5],
        ['accent', 'surface', 4.5],
        ['danger', 'surface', 4.5],
        ['warning', 'surface', 4.5],
      ])('%s on %s is at least %s:1', (fg, bg, min) => {
        expect(ratio(set, fg, bg)).toBeGreaterThanOrEqual(min);
      });

      it.each(['a', 'b', 'c', 'd', 'e', 'f'])(
        'ring colour twin-%s is at least 3:1 against the surface',
        (slot) => {
          expect(ratio(set, `twin-${slot}`, 'surface')).toBeGreaterThanOrEqual(3);
        },
      );

      it.each(['a', 'b', 'c', 'd', 'e', 'f'])('badge text on twin-%s is at least 4.5:1', (slot) => {
        expect(ratio(set, 'on-accent', `twin-${slot}`)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
