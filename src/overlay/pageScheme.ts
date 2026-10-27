// The overlay follows the store page's real background, not the OS setting (SPEC AC-X.4): a dark
// OS with a white store page still gets the light overlay, because it sits on white.

export type Scheme = 'light' | 'dark';

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses any CSS colour the browser understands by painting it to one canvas pixel. */
function toRgba(doc: Document, color: string): Rgba | null {
  try {
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'black';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0] ?? 0, g: d[1] ?? 0, b: d[2] ?? 0, a: (d[3] ?? 0) / 255 };
  } catch {
    return null;
  }
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(c: Pick<Rgba, 'r' | 'g' | 'b'>): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** Dark when the page behind the overlay is darker than mid grey. */
export function schemeForLuminance(l: number): Scheme {
  return l < 0.18 ? 'dark' : 'light';
}

/** Walks from <body> up to <html> for the first visible background; a transparent page is white. */
export function samplePageScheme(doc: Document): Scheme {
  const view = doc.defaultView;
  if (!view) return 'light';
  for (const el of [doc.body, doc.documentElement]) {
    if (!el) continue;
    const bg = view.getComputedStyle(el).backgroundColor;
    if (!bg || bg === 'transparent') continue;
    const rgba = toRgba(doc, bg);
    if (rgba && rgba.a > 0.5) return schemeForLuminance(luminance(rgba));
  }
  return 'light';
}
