import type { PixelDiffResult } from '../core/hash/pixelDiff';
import type { RgbaImage } from '../core/hash/resample';
import type { ReadRecord } from '../core/net';
import type { ImageHashes, StoreId } from '../core/types';

export type ReadError =
  'invalid-url' | 'not-allowlisted' | 'network' | 'http' | 'not-image' | 'too-large' | 'decode';

/** One thumbnail read: pixels, or why there are none, plus what the network saw. */
export type ReadResult =
  | { ok: true; image: RgbaImage; host: string; fromCache: boolean | null }
  | { ok: false; error: ReadError; host: string | null };

export type HashOutcome =
  /** `record` is null for a repeated URL in the same request (it was read once). */
  | { url: string; ok: true; hashes: ImageHashes; record: ReadRecord | null }
  | { url: string; ok: false; error: ReadError; record: ReadRecord | null };

export interface HashRequest {
  store: StoreId;
  urls: string[];
}

export interface DiffRequest {
  store: StoreId;
  a: string;
  b: string;
}

export type DiffOutcome =
  | { ok: true; result: PixelDiffResult; records: ReadRecord[] }
  | { ok: false; error: ReadError; records: ReadRecord[] };

/**
 * The hasher context (ADR decision 3): a Chrome offscreen document or the Firefox background page.
 * Both implement this, so the coordinator never knows which one it talks to.
 */
export interface Hasher {
  hash(req: HashRequest): Promise<HashOutcome[]>;
  diff(req: DiffRequest): Promise<DiffOutcome>;
}

/** Turns an encoded image into RGBA pixels. Browser: createImageBitmap + OffscreenCanvas. Node tests: sharp. */
export type DecodeImage = (blob: Blob) => Promise<RgbaImage>;

/** Reports whether the browser served `url` from its HTTP cache; null when it cannot tell. */
export type CacheStatus = (url: string) => boolean | null;
