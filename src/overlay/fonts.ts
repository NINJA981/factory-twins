// @font-face inside a shadow root is ignored by Chromium, so the overlay declares its families once
// in the store page's document head, pointing at web_accessible_resources (ADR, fonts in the
// overlay). If the page CSP blocks them (SPEC Q3) the families fall back to the metric-matched
// system stack from DESIGN.md without any visible error.

export const FONT_STYLE_ID = 'ft-fonts';

export function fontCss(resolve: (path: string) => string): string {
  return [
    `@font-face{font-family:'Rethink Sans Variable';font-style:normal;font-display:swap;font-weight:400 800;`,
    `src:url('${resolve('/fonts/rethink-sans-latin-wght.woff2')}') format('woff2-variations');}`,
    `@font-face{font-family:'Bricolage Grotesque Variable';font-style:normal;font-display:swap;font-weight:600 700;font-stretch:85%;`,
    `src:url('${resolve('/fonts/bricolage-grotesque-wdth85-latin.woff2')}') format('woff2-variations');}`,
  ].join('');
}

export function installFonts(doc: Document, resolve: (path: string) => string): () => void {
  if (doc.getElementById(FONT_STYLE_ID)) return () => undefined;
  const style = doc.createElement('style');
  style.id = FONT_STYLE_ID;
  style.textContent = fontCss(resolve);
  (doc.head ?? doc.documentElement).append(style);
  return () => style.remove();
}
