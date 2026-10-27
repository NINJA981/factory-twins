// AC-W.11 and AC-W.13 as static checks over the site's sources. Run with `pnpm test` (node --test via tsx).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

const root = join(import.meta.dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (f: string) => relative(root, f).replaceAll('\\', '/');
const read = (f: string) => readFileSync(join(root, f), 'utf8');
const css = walk(join(root, 'src')).filter((f) => f.endsWith('.css'));
const colourLiteral = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

describe('AC-W.11: the site draws with the extension tokens', () => {
  it('has style sheets to check, and they import the generated token file', () => {
    assert.ok(css.length >= 2);
    assert.match(read('src/styles/base.css'), /@import '@tokens\/tokens\.css'/);
  });

  it('writes no colour literal in any style sheet under site/src', () => {
    const hits = css.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${rel(f)}:${i + 1}` }))
        // Comments may name a colour; declarations may not.
        .filter(({ line }) => !line.trim().startsWith('/*') && !line.trim().startsWith('*'))
        .filter(({ line }) => colourLiteral.test(line))
        .map(({ line, at }) => `${at}  ${line.trim()}`),
    );
    assert.deepEqual(hits, []);
  });

  it('writes no colour literal in the inline styles of the two pages', () => {
    const hits: string[] = [];
    for (const page of ['index.html', 'app/index.html']) {
      for (const m of read(page).matchAll(/style="([^"]*)"|<style[^>]*>([\s\S]*?)<\/style>/g)) {
        const body = m[1] ?? m[2] ?? '';
        if (colourLiteral.test(body)) hits.push(`${page}: ${body.slice(0, 80)}`);
      }
    }
    assert.deepEqual(hits, []);
  });

  it('follows the browser for colour scheme and for motion', () => {
    const all = css.map((f) => readFileSync(f, 'utf8')).join('\n');
    assert.match(all, /prefers-reduced-motion/);
    assert.match(read('../src/styles/tokens.css'), /prefers-color-scheme:\s*dark/);
  });
});

describe('AC-W.13: the sample and the landing page are labelled as made up', () => {
  it('says so in the web app and on the landing page', () => {
    assert.match(read('app/index.html') + read('src/app/main.ts'), /made up/i);
    assert.match(read('index.html'), /made up/i);
  });

  it('has no testimonial, star count, install count or placeholder copy in either page', () => {
    for (const page of ['index.html', 'app/index.html']) {
      const text = read(page);
      assert.doesNotMatch(text, /lorem ipsum/i, page);
      assert.doesNotMatch(text, /testimonial/i, page);
      assert.doesNotMatch(text, /\d[\d,.]*\s*(?:github\s+)?stars\b/i, page);
      assert.doesNotMatch(text, /\d[\d,.]*\+?\s*(?:installs|downloads|active users)/i, page);
    }
  });

  it('bundles no store logo or trade dress file', () => {
    const files = walk(join(root, 'public')).map(rel);
    assert.equal(files.filter((f) => /amazon|walmart/i.test(f.split('/').pop() ?? '')).length, 0);
  });
});
