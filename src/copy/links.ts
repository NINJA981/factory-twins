import type { StoreId } from '../core/types';

// Where the source lives. This is the only place the extension writes the repository URL down:
// the options page, the pill and the popup all follow it. The site reads the same default
// (site/vite.config.ts, overridable with FT_REPO_URL).
export const REPO_URL = 'https://github.com/NINJA981/factory-twins';

/** Prefilled issue link for the "Report layout" action. Carries the store and adapter version only. */
export function layoutReportUrl(store: StoreId, adapterVersion: number): string {
  const params = new URLSearchParams({
    title: `Layout changed on ${store}`,
    body: `Store: ${store}
Adapter version: ${adapterVersion}
Page type: search results

(No page content is included in this link.)`,
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}
