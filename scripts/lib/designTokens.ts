// Reads the YAML front matter of DESIGN.md (the subset the Stitch format uses: two- and
// three-level maps of scalars) and renders src/styles/tokens.css from it. DESIGN.md is the
// single source of truth; tests/unit/tokens.test.ts fails if tokens.css drifts from it.

export type TokenTree = Record<string, Record<string, string | Record<string, string>>>;

function unquote(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

export function parseFrontMatter(markdown: string): TokenTree {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!m?.[1]) throw new Error('DESIGN.md has no front matter');
  const tree: TokenTree = {};
  let top: Record<string, string | Record<string, string>> | null = null;
  let second: Record<string, string> | null = null;
  for (const rawLine of m[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trim();
    const idx = line.indexOf(':');
    if (idx < 0) throw new Error(`Unparseable front matter line: ${rawLine}`);
    const key = unquote(line.slice(0, idx));
    const value = line.slice(idx + 1).trim();
    if (indent === 0) {
      if (value) {
        top = null;
        continue; // name, description
      }
      top = {};
      tree[key] = top;
      second = null;
    } else if (indent === 2 && top) {
      if (value) {
        top[key] = unquote(value);
        second = null;
      } else {
        second = {};
        top[key] = second;
      }
    } else if (indent === 4 && second) {
      second[key] = unquote(value);
    } else {
      throw new Error(`Unexpected indentation: ${rawLine}`);
    }
  }
  return tree;
}

const DARK_SUFFIX = '-dark';

function flat(group: Record<string, string | Record<string, string>> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!group) return out;
  for (const [k, v] of Object.entries(group)) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Splits colour tokens into light and dark sets; `x-dark` overrides `x` in dark mode. */
export function splitColors(tree: TokenTree): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  const colors = flat(tree.colors);
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) {
    if (k === 'primary') continue; // Stitch alias of `accent`
    if (k.endsWith(DARK_SUFFIX)) dark[k.slice(0, -DARK_SUFFIX.length)] = v;
    else light[k] = v;
  }
  for (const k of Object.keys(dark))
    if (!(k in light)) throw new Error(`Dark token ${k}-dark has no light token`);
  return { light, dark };
}

// Values that DESIGN.md states in prose (Elevation, Motion) rather than in front matter.
// Copied verbatim from DESIGN.md › Elevation & Depth and › Motion system.
export const PROSE_TOKENS = {
  light: {
    'elev-e1': '0 0 0 1px var(--border), 0 1px 2px oklch(0.25 0.02 345 / 0.04)',
    'elev-e2':
      '0 0 0 1px oklch(0.25 0.02 345 / 0.06), 0 1px 1px oklch(0.25 0.02 345 / 0.02), 0 2px 4px -1px oklch(0.25 0.02 345 / 0.06)',
    'elev-e3':
      '0 0 0 1px oklch(0.25 0.02 345 / 0.06), 0 2px 4px -1px oklch(0.25 0.02 345 / 0.06), 0 8px 16px -4px oklch(0.25 0.02 345 / 0.12)',
    'elev-e4':
      '0 0 0 1px oklch(0.25 0.02 345 / 0.06), 0 8px 16px -4px oklch(0.25 0.02 345 / 0.08), 0 24px 48px -12px oklch(0.25 0.02 345 / 0.22)',
  },
  dark: {
    'elev-e1': '0 0 0 1px var(--border), inset 0 1px 0 oklch(1 0 0 / 0.05)',
    'elev-e2': '0 0 0 1px var(--border), inset 0 1px 0 oklch(1 0 0 / 0.05)',
    'elev-e3': '0 0 0 1px var(--border), inset 0 1px 0 oklch(1 0 0 / 0.05)',
    'elev-e4': '0 0 0 1px oklch(1 0 0 / 0.06), 0 24px 48px -12px oklch(0 0 0 / 0.6)',
  },
  motion: {
    'dur-0': '0ms',
    'dur-1': '100ms',
    'dur-2': '150ms',
    'dur-3': '200ms',
    'dur-4': '250ms',
    'dur-5': '300ms',
    'ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
    'ease-out-soft': 'cubic-bezier(0.25, 1, 0.5, 1)',
    'ease-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
    'ease-scene': 'cubic-bezier(0.65, 0.05, 0, 1)',
    'spring-playful': 'linear(0, 0.157, 0.48, 0.79, 1.01, 1.11, 1.12, 1.08, 1.03, 0.99, 0.98, 0.99, 1)',
  },
  font: {
    'font-display': "'Bricolage Grotesque Variable', 'Bricolage Fallback', system-ui, sans-serif",
    'font-sans': "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif",
  },
} as const;

function block(
  selector: string,
  scheme: 'light' | 'dark',
  vars: Record<string, string>,
  indent = '',
): string {
  const lines = [`${indent}  color-scheme: ${scheme};`];
  for (const [k, v] of Object.entries(vars)) lines.push(`${indent}  --${k}: ${v};`);
  return `${indent}${selector} {\n${lines.join('\n')}\n${indent}}`;
}

export function renderTokensCss(tree: TokenTree): string {
  const { light, dark } = splitColors(tree);
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(light)) base[k] = v;
  for (const [k, v] of Object.entries(PROSE_TOKENS.light)) base[k] = v;
  for (const [k, v] of Object.entries(flat(tree.rounded))) base[`radius-${k}`] = v;
  for (const [k, v] of Object.entries(flat(tree.spacing))) base[`space-${k.replace('.', '_')}`] = v;
  for (const [k, v] of Object.entries(PROSE_TOKENS.motion)) base[k] = v;
  for (const [k, v] of Object.entries(PROSE_TOKENS.font)) base[k] = v;
  const typo = tree.typography ?? {};
  for (const [name, spec] of Object.entries(typo)) {
    if (typeof spec === 'string') continue;
    if (spec.fontSize) base[`text-${name}-size`] = spec.fontSize;
    if (spec.lineHeight) base[`text-${name}-leading`] = spec.lineHeight;
    if (spec.fontWeight) base[`text-${name}-weight`] = spec.fontWeight;
    if (spec.letterSpacing) base[`text-${name}-tracking`] = spec.letterSpacing;
    if (spec.fontVariation) base[`text-${name}-variation`] = spec.fontVariation;
  }
  const darkVars: Record<string, string> = { ...dark, ...PROSE_TOKENS.dark };

  return [
    '/* GENERATED from DESIGN.md front matter by scripts/gen-tokens.ts. Do not edit by hand. */',
    '/* `:host` makes every token resolve inside the overlay shadow roots too. */',
    block(':root,\n:host', 'light', base),
    '',
    '/* Dark: extension pages follow prefers-color-scheme; the overlay host gets data-theme from the',
    '   sampled store background (src/overlay/pageScheme.ts), never from the OS setting. */',
    block(':root[data-theme="dark"],\n:host([data-theme="dark"])', 'dark', darkVars),
    '',
    '@media (prefers-color-scheme: dark) {',
    block(':root:not([data-theme="light"])', 'dark', darkVars, '  '),
    '}',
    '',
  ].join('\n');
}

/**
 * Renders the Tailwind v4 `@theme inline` block. Default namespaces are reset to `initial` so
 * only DESIGN.md tokens exist as utilities (no off-token colours, radii, shadows or type sizes).
 * Colours and elevations point at the runtime variables in tokens.css so dark mode and the
 * overlay's data-theme switch work; static scales are inlined as literal values.
 */
export function renderThemeCss(tree: TokenTree): string {
  const { light } = splitColors(tree);
  const lines: string[] = [
    '/* GENERATED from DESIGN.md front matter by scripts/gen-tokens.ts. Do not edit by hand. */',
    '@theme inline {',
    '  --color-*: initial;',
    '  --radius-*: initial;',
    '  --shadow-*: initial;',
    '  --text-*: initial;',
    '  --font-*: initial;',
    '  --ease-*: initial;',
    '  --spacing: 4px;',
    '  --color-transparent: transparent;',
    '  --color-current: currentColor;',
  ];
  for (const k of Object.keys(light)) lines.push(`  --color-${k}: var(--${k});`);
  for (const [k, v] of Object.entries(flat(tree.rounded))) lines.push(`  --radius-${k}: ${v};`);
  for (const n of [1, 2, 3, 4]) lines.push(`  --shadow-e${n}: var(--elev-e${n});`);
  lines.push(`  --font-display: ${PROSE_TOKENS.font['font-display']};`);
  lines.push(`  --font-sans: ${PROSE_TOKENS.font['font-sans']};`);
  for (const [name, spec] of Object.entries(tree.typography ?? {})) {
    if (typeof spec === 'string') continue;
    if (spec.fontSize) lines.push(`  --text-${name}: ${spec.fontSize};`);
    if (spec.lineHeight) lines.push(`  --text-${name}--line-height: ${spec.lineHeight};`);
    if (spec.letterSpacing) lines.push(`  --text-${name}--letter-spacing: ${spec.letterSpacing};`);
    if (spec.fontWeight) lines.push(`  --text-${name}--font-weight: ${spec.fontWeight};`);
  }
  for (const k of ['ease-out', 'ease-out-soft', 'ease-in-out', 'ease-scene'] as const) {
    lines.push(`  --${k}: ${PROSE_TOKENS.motion[k]};`);
  }
  lines.push('}', '');
  return lines.join('\n');
}
