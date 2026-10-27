// URL hygiene. Image URLs are kept byte-for-byte except for tracking parameters (SPEC §8.1: the
// adapter never rewrites a size token, so the hasher re-reads the file the page already loaded).

const TRACKING_PARAMS = [
  /^utm_/i,
  /^ref_?$/i,
  /^pf_rd_/i,
  /^pd_rd_/i,
  /^qid$/i,
  /^sr$/i,
  /^crid$/i,
  /^sprefix$/i,
  /^dib/i,
  /^content-id$/i,
  /^athena/i,
  /^adsid$/i,
  /^campaign_id$/i,
  /^ad_id$/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
];

export function isTrackingParam(name: string): boolean {
  return TRACKING_PARAMS.some((re) => re.test(name));
}

/** Resolves against `base`, drops the fragment and tracking parameters. Returns null for non-http(s). */
export function normalizeImageUrl(raw: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  url.hash = '';
  for (const name of [...url.searchParams.keys()]) if (isTrackingParam(name)) url.searchParams.delete(name);
  return url.toString();
}

/**
 * Picks the URL the browser displayed. `currentSrc` when the element has loaded; otherwise `src`;
 * otherwise the first `srcset` candidate (lazy tiles that have not decoded yet).
 */
export function displayedImageUrl(img: {
  currentSrc?: string;
  getAttribute(name: string): string | null;
}): string | null {
  const current = img.currentSrc;
  if (current) return current;
  const src = img.getAttribute('src');
  if (src && !src.startsWith('data:')) return src;
  const srcset = img.getAttribute('srcset') ?? img.getAttribute('data-srcset');
  const first = srcset?.split(',')[0]?.trim().split(/\s+/)[0];
  if (first) return first;
  const lazy = img.getAttribute('data-src');
  return lazy && !lazy.startsWith('data:') ? lazy : null;
}
