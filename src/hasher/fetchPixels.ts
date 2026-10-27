import type { StoreId } from '../core/types';
import { checkImageUrl, type AllowlistOptions } from './allowlist';
import type { CacheStatus, DecodeImage, ReadResult } from './types';

/** Thumbnails are a few KB; anything this large is not a thumbnail and is not decoded. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface ReadDeps extends AllowlistOptions {
  fetch: typeof fetch;
  decode: DecodeImage;
  cacheStatus?: CacheStatus;
}

/**
 * Fetch options for every thumbnail read (SPEC §10 network policy): no cookies, no referrer, prefer
 * the HTTP cache, and never follow a redirect (a redirect could lead off the allowlist before we
 * could check the new host).
 */
export const IMAGE_FETCH_INIT: RequestInit = {
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
  cache: 'force-cache',
  redirect: 'error',
  mode: 'cors',
};

/**
 * Reads one thumbnail into pixels (SPEC F0, AC-F2.4). The allowlist check happens before any
 * request; a refused URL is never fetched. Pixels come from decoding the response `Blob`, so no
 * canvas ever touches a cross-origin image element and nothing is tainted.
 */
export async function readImage(rawUrl: string, store: StoreId, deps: ReadDeps): Promise<ReadResult> {
  const allowed = checkImageUrl(rawUrl, store, deps);
  if (!allowed.ok) return { ok: false, error: allowed.reason, host: null };
  const { url, host } = allowed;
  let res: Response;
  try {
    res = await deps.fetch(url.href, IMAGE_FETCH_INIT);
  } catch {
    return { ok: false, error: 'network', host };
  }
  if (!res.ok) return { ok: false, error: 'http', host };
  const type = res.headers.get('content-type') ?? '';
  if (type && !/^image\//i.test(type)) return { ok: false, error: 'not-image', host };
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > MAX_IMAGE_BYTES) return { ok: false, error: 'too-large', host };
  let blob: Blob;
  try {
    blob = await res.blob();
  } catch {
    return { ok: false, error: 'network', host };
  }
  if (blob.size > MAX_IMAGE_BYTES) return { ok: false, error: 'too-large', host };
  try {
    const image = await deps.decode(blob);
    return { ok: true, image, host, fromCache: deps.cacheStatus?.(url.href) ?? null };
  } catch {
    return { ok: false, error: 'decode', host };
  }
}
