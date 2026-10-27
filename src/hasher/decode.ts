import type { RgbaImage } from '../core/hash/resample';
import type { CacheStatus, DecodeImage } from './types';

// Browser-only adapters for the hasher context (offscreen document or Firefox background page).
// Nothing here touches the page: pixels come from a Blob the extension fetched itself.

/** Larger sources are scaled down while decoding; hashes resample to ≤ 256 px anyway. */
export const MAX_DECODE_SIDE = 1024;

export const decodeWithCanvas: DecodeImage = async (blob) => {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const image: RgbaImage = { width, height, data };
    return image;
  } finally {
    bitmap.close();
  }
};

export interface TimingEntry {
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  responseStart: number;
}

/**
 * Cache status from a resource timing entry (SPEC AC-F0.3). Cross-origin responses without
 * Timing-Allow-Origin report zeros for every size, which is indistinguishable from "no data", so
 * that case is `null` (unknown) rather than a claimed cache hit.
 */
export function cacheStatusFromTiming(entry: TimingEntry | undefined): boolean | null {
  if (!entry) return null;
  if (entry.transferSize > 0) return false;
  if (entry.encodedBodySize > 0 || entry.decodedBodySize > 0) return true;
  return null;
}

export const performanceCacheStatus: CacheStatus = (url) => {
  const entries = performance.getEntriesByName(url, 'resource') as PerformanceResourceTiming[];
  return cacheStatusFromTiming(entries[entries.length - 1]);
};
