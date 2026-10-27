// Deterministic synthetic product photos (ADR, fixture strategy). Seeded shapes on white stand in
// for store thumbnails so pixel-level tests and hashes never need a store's copyrighted images.
import sharp from 'sharp';
import type { RgbaImage } from '../../src/core/hash/resample';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Silhouette = 'stand' | 'strip' | 'tripod' | 'jar' | 'kit' | 'tray' | 'bottle' | 'ring';
export const SILHOUETTES: readonly Silhouette[] = [
  'stand',
  'strip',
  'tripod',
  'jar',
  'kit',
  'tray',
  'bottle',
  'ring',
];

export interface PhotoSpec {
  seed: number;
  silhouette: Silhouette;
  /** Hue shift in degrees, for colour variants of one listing. */
  hueShift?: number;
}

const SIZE = 400;

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function jitter(rnd: () => number, v: number, amount: number): number {
  return v + (rnd() - 0.5) * 2 * amount;
}

function pts(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function body(spec: PhotoSpec, rnd: () => number, hue: number): string {
  const main = hsl(hue, 55 + rnd() * 30, 30 + rnd() * 30);
  const dark = hsl(hue + 12, 40, 24 + rnd() * 10);
  const light = hsl(hue - 10, 45 + rnd() * 20, 55 + rnd() * 30);
  const j = (v: number, a = 22) => jitter(rnd, v, a);
  switch (spec.silhouette) {
    case 'stand':
      return [
        `<polygon points="${pts([
          [j(70), j(300)],
          [j(330), j(300)],
          [j(300), j(250)],
          [j(110), j(250)],
        ])}" fill="${main}"/>`,
        `<polygon points="${pts([
          [j(110), j(250)],
          [j(300), j(250)],
          [j(280), j(110)],
          [j(150), j(110)],
        ])}" fill="${light}"/>`,
        `<rect x="${j(185, 25)}" y="${j(120, 20)}" width="${j(40, 12)}" height="${j(140, 25)}" fill="${dark}"/>`,
      ].join('');
    case 'strip':
      return [
        `<path d="M ${j(40)} ${j(300)} C ${j(140)} ${j(110)}, ${j(260)} ${j(340)}, ${j(360)} ${j(130)}" stroke="${main}" stroke-width="${j(26, 8)}" fill="none" stroke-linecap="round"/>`,
        ...Array.from(
          { length: 6 },
          (_, i) =>
            `<circle cx="${60 + i * 50 + j(0, 10)}" cy="${j(220, 70)}" r="${j(14, 5)}" fill="${light}"/>`,
        ),
        `<rect x="${j(300, 20)}" y="${j(320, 15)}" width="${j(60, 14)}" height="${j(40, 10)}" fill="${dark}"/>`,
      ].join('');
    case 'tripod':
      return [
        `<line x1="200" y1="${j(150, 20)}" x2="${j(90, 25)}" y2="${j(350, 20)}" stroke="${main}" stroke-width="${j(18, 5)}" stroke-linecap="round"/>`,
        `<line x1="200" y1="${j(150, 20)}" x2="${j(310, 25)}" y2="${j(350, 20)}" stroke="${main}" stroke-width="${j(18, 5)}" stroke-linecap="round"/>`,
        `<line x1="200" y1="${j(150, 20)}" x2="${j(200, 40)}" y2="${j(360, 15)}" stroke="${dark}" stroke-width="${j(18, 5)}" stroke-linecap="round"/>`,
        `<rect x="${j(150, 20)}" y="${j(70, 18)}" width="${j(100, 25)}" height="${j(70, 18)}" rx="10" fill="${light}"/>`,
      ].join('');
    case 'jar':
      return [
        `<rect x="${j(110, 18)}" y="${j(130, 18)}" width="${j(180, 30)}" height="${j(200, 30)}" rx="${j(26, 8)}" fill="${light}"/>`,
        `<rect x="${j(125, 18)}" y="${j(90, 14)}" width="${j(150, 30)}" height="${j(50, 12)}" rx="8" fill="${main}"/>`,
        `<circle cx="${j(200, 30)}" cy="${j(240, 30)}" r="${j(46, 14)}" fill="${dark}"/>`,
      ].join('');
    case 'kit':
      return Array.from({ length: 5 }, (_, i) => {
        const x = 50 + i * 62 + jitter(rnd, 0, 8);
        const h = 120 + rnd() * 160;
        return `<rect x="${x}" y="${330 - h}" width="${j(44, 10)}" height="${h}" rx="9" fill="${i % 2 ? main : dark}"/><circle cx="${x + 22}" cy="${330 - h}" r="${j(26, 8)}" fill="${light}"/>`;
      }).join('');
    case 'tray':
      return [
        `<rect x="${j(60, 14)}" y="${j(160, 20)}" width="${j(280, 30)}" height="${j(150, 30)}" rx="14" fill="${main}"/>`,
        ...Array.from(
          { length: 3 },
          (_, i) =>
            `<rect x="${90 + i * 82 + j(0, 8)}" y="${j(190, 14)}" width="${j(64, 10)}" height="${j(90, 20)}" rx="8" fill="${light}"/>`,
        ),
        `<rect x="${j(120, 20)}" y="${j(110, 14)}" width="${j(160, 30)}" height="${j(34, 10)}" rx="8" fill="${dark}"/>`,
      ].join('');
    case 'bottle':
      return [
        `<rect x="${j(160, 14)}" y="${j(60, 12)}" width="${j(80, 14)}" height="${j(70, 14)}" fill="${dark}"/>`,
        `<path d="M ${j(160, 10)} 130 C ${j(90, 25)} ${j(180, 20)}, ${j(90, 25)} ${j(330, 20)}, ${j(110, 20)} 350 L ${j(290, 20)} 350 C ${j(310, 25)} ${j(330, 20)}, ${j(310, 25)} ${j(180, 20)}, ${j(240, 10)} 130 Z" fill="${main}"/>`,
        `<rect x="${j(130, 20)}" y="${j(220, 24)}" width="${j(140, 24)}" height="${j(70, 16)}" rx="6" fill="${light}"/>`,
      ].join('');
    case 'ring':
      return [
        `<circle cx="200" cy="${j(190, 18)}" r="${j(110, 18)}" fill="none" stroke="${main}" stroke-width="${j(34, 10)}"/>`,
        `<circle cx="${j(200, 18)}" cy="${j(190, 18)}" r="${j(40, 14)}" fill="${light}"/>`,
        `<rect x="${j(170, 20)}" y="${j(310, 14)}" width="${j(60, 14)}" height="${j(60, 12)}" fill="${dark}"/>`,
      ].join('');
  }
}

/** SVG for a seeded product photo: category silhouette plus a few seeded accents, on white. */
export function photoSvg(spec: PhotoSpec): string {
  const rnd = mulberry32(spec.seed);
  const hue = rnd() * 360 + (spec.hueShift ?? 0);
  // Products differ in pose and framing: rotate, scale and shift the whole body per seed.
  const rot = (rnd() - 0.5) * 70;
  const sc = 0.72 + rnd() * 0.45;
  const dx = (rnd() - 0.5) * 70;
  const dy = (rnd() - 0.5) * 60;
  const accents = Array.from({ length: 3 + Math.floor(rnd() * 4) }, () => {
    const x = 70 + rnd() * 260;
    const y = 70 + rnd() * 260;
    const r = 10 + rnd() * 30;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${hsl(hue + 140 + rnd() * 80, 60, 40 + rnd() * 35)}" opacity="0.9"/>`;
  }).join('');
  const shadow = `<ellipse cx="200" cy="${340 + Math.floor(rnd() * 25)}" rx="${120 + Math.floor(rnd() * 50)}" ry="12" fill="#000" opacity="0.08"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="#fff"/>${shadow}<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${rot.toFixed(1)} 200 200) translate(200 200) scale(${sc.toFixed(2)}) translate(-200 -200)">${body(spec, rnd, hue)}</g>${accents}</svg>`;
}

export async function renderPhoto(spec: PhotoSpec): Promise<Buffer> {
  return sharp(Buffer.from(photoSvg(spec)))
    .png()
    .toBuffer();
}

export interface Transform {
  /** JPEG quality, 60 to 95. */
  quality: number;
  /** Scale factor, 0.5 to 2. */
  scale: number;
  /** Border crop as a share of each side, 0 to 0.03. */
  crop: number;
  /** Brightness multiplier, 0.95 to 1.05. */
  brightness: number;
}

export function randomTransform(rnd: () => number): Transform {
  return {
    quality: 60 + Math.floor(rnd() * 36),
    scale: 0.5 + rnd() * 1.5,
    crop: rnd() * 0.03,
    brightness: 0.95 + rnd() * 0.1,
  };
}

/** The photo as a re-upload would look: cropped, rescaled, brightened, JPEG-encoded. */
export async function encodeTwin(png: Buffer, t: Transform): Promise<Buffer> {
  const meta = await sharp(png).metadata();
  const w = meta.width ?? SIZE;
  const h = meta.height ?? SIZE;
  const cx = Math.round(w * t.crop);
  const cy = Math.round(h * t.crop);
  return sharp(png)
    .extract({ left: cx, top: cy, width: w - 2 * cx, height: h - 2 * cy })
    .resize(Math.max(8, Math.round(w * t.scale)), Math.max(8, Math.round(h * t.scale)), {
      kernel: 'lanczos3',
    })
    .modulate({ brightness: t.brightness })
    .jpeg({ quality: t.quality })
    .toBuffer();
}

export async function encodeOriginal(png: Buffer, quality = 90): Promise<Buffer> {
  return sharp(png).jpeg({ quality }).toBuffer();
}

/** Decodes any encoded image to the RGBA buffer the production hash code takes. */
export async function decodeRgba(encoded: Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
}
