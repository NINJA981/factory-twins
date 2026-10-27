// Regenerates src/styles/tokens.css and src/styles/theme.css from DESIGN.md. Run: pnpm tokens
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter, renderThemeCss, renderTokensCss } from './lib/designTokens';

const root = fileURLToPath(new URL('..', import.meta.url));
const tree = parseFrontMatter(readFileSync(`${root}DESIGN.md`, 'utf8'));
writeFileSync(`${root}src/styles/tokens.css`, renderTokensCss(tree));
writeFileSync(`${root}src/styles/theme.css`, renderThemeCss(tree));
console.log('Wrote src/styles/tokens.css and src/styles/theme.css');
