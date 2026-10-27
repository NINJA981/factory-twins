// The thin browser adapter between the engine and the page: turns an image URL (a bundled static
// file, or a blob: URL of a photo the visitor picked) into RGBA pixels. The engine itself stays pure;
// this is the only place the site decodes images. Nothing here makes a network request except
// fetching same-origin static files and blob: URLs.
import { pixelDiff, type PixelDiffResult, type RgbaImage } from '@engine';

/** Largest side decoded; hashes and the lens resample to 256 px anyway (same cap as the extension). */
export const MAX_DECODE_SIDE = 1024;

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Decodes an encoded image into RGBA, scaled down so the longest side is at most MAX_DECODE_SIDE. */
export async function decodeBlob(blob: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error('2d canvas unavailable');
    // Letterbox on white like a marketplace photo, so transparent PNGs hash like their white version.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    return { width, height, data };
  } finally {
    bitmap.close();
  }
}

export async function decodeUrl(url: string): Promise<RgbaImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return decodeBlob(await res.blob());
}

const cache = new Map<string, Promise<RgbaImage>>();

function cached(url: string): Promise<RgbaImage> {
  let p = cache.get(url);
  if (!p) {
    p = decodeUrl(url);
    cache.set(url, p);
    p.catch(() => cache.delete(url));
    // Keep a handful: the lens only ever needs the two photos on screen plus a swap or two.
    if (cache.size > 6) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

/** Proof lens measurement with the engine's pixelDiff (256 x 256, channel threshold 24). */
export async function measurePair(urlA: string, urlB: string): Promise<PixelDiffResult> {
  const [a, b] = await Promise.all([cached(urlA), cached(urlB)]);
  return pixelDiff(a, b);
}

export type Measure = typeof measurePair;

export interface Ingested {
  /** Pixels for hashing (longest side at most MAX_DECODE_SIDE). */
  image: RgbaImage;
  /** A small JPEG for display and the lens, so a 12 MP camera photo is never drawn at full size. */
  thumb: Blob;
}

const THUMB_SIDE = 480;

function toBlob(canvas: OffscreenCanvas | HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, quality),
  );
}

/** Decodes a picked file once: RGBA for the hash and a display thumbnail. Throws if the browser cannot open it. */
export async function ingestFile(file: Blob): Promise<Ingested> {
  const bitmap = await createImageBitmap(file);
  try {
    const draw = (maxSide: number) => {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = makeCanvas(width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D
        | null;
      if (!ctx) throw new Error('2d canvas unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      return { canvas, ctx, width, height };
    };
    const big = draw(MAX_DECODE_SIDE);
    const image: RgbaImage = {
      width: big.width,
      height: big.height,
      data: big.ctx.getImageData(0, 0, big.width, big.height).data,
    };
    const small = draw(THUMB_SIDE);
    return { image, thumb: await toBlob(small.canvas, 'image/jpeg', 0.86) };
  } finally {
    bitmap.close();
  }
}
