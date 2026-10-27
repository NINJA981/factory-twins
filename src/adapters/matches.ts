import type { StoreId } from '../core/types';

/** Local fixture server used only by `--mode e2e` builds. */
export const E2E_ORIGIN = 'http://localhost:4817';

const RELEASE_MATCHES: Record<StoreId, string[]> = {
  'amazon-us': ['https://www.amazon.com/s*'],
  'walmart-us': ['https://www.walmart.com/search*'],
};

/**
 * Content-script match patterns per store (SPEC AC-F1.5). The e2e build adds the local fixture
 * server, which serves Amazon-shaped pages under /s and Walmart-shaped pages under /search.
 */
export function contentScriptMatches(store: StoreId, e2e: boolean): string[] {
  const release = RELEASE_MATCHES[store];
  if (!e2e) return [...release];
  return [...release, store === 'amazon-us' ? `${E2E_ORIGIN}/s*` : `${E2E_ORIGIN}/search*`];
}

/** Turns a URL match pattern into its origin-wide form (`https://host/*`), as `web_accessible_resources` requires. */
export function originPattern(pattern: string): string {
  const m = /^([a-z*]+:\/\/[^/]+)\//.exec(pattern);
  if (!m) throw new Error(`Not a match pattern: ${pattern}`);
  return `${m[1]}/*`;
}
