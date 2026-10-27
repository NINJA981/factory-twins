import type { StoreId } from '../core/types';
import { E2E_ORIGIN } from '../adapters/matches';

/**
 * The only image hosts Factory Twins may ever read from (SPEC §10, AC-F2.4, AC-X.2).
 * This file is the single place hosts are defined; the manifest's host_permissions are derived
 * from it and a unit test asserts the two stay equal.
 */
export const IMAGE_HOSTS: Record<StoreId, readonly string[]> = {
  'amazon-us': ['m.media-amazon.com', 'images-na.ssl-images-amazon.com'],
  'walmart-us': ['i5.walmartimages.com'],
};

export interface AllowlistOptions {
  /** Test builds also allow the local fixture server. Never true in a release build. */
  e2e?: boolean;
}

export function hostPermissionPatterns(opts: AllowlistOptions = {}): string[] {
  const hosts = new Set<string>();
  for (const list of Object.values(IMAGE_HOSTS)) for (const h of list) hosts.add(`https://${h}/*`);
  if (opts.e2e) hosts.add(`${E2E_ORIGIN}/*`);
  return [...hosts];
}

export type AllowResult =
  { ok: true; url: URL; host: string } | { ok: false; reason: 'invalid-url' | 'not-allowlisted' };

/**
 * Checks a thumbnail URL before any request is made. Only `https:` on an exact allowlisted host
 * with the default port and no embedded credentials passes (plus the e2e origin in test builds).
 */
export function checkImageUrl(raw: string, store: StoreId, opts: AllowlistOptions = {}): AllowResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
  if (url.username || url.password) return { ok: false, reason: 'not-allowlisted' };
  if (opts.e2e && url.origin === E2E_ORIGIN) return { ok: true, url, host: url.host };
  if (url.protocol !== 'https:' || url.port !== '') return { ok: false, reason: 'not-allowlisted' };
  const host = url.hostname.toLowerCase();
  if (!IMAGE_HOSTS[store].includes(host)) return { ok: false, reason: 'not-allowlisted' };
  return { ok: true, url, host };
}
