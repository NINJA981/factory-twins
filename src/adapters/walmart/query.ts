import type { QueryInfo } from '../../core/session/queryKey';
import { E2E_ORIGIN } from '../matches';
import { pageParam, pickParams } from '../listing';

/** Parameters that change Walmart's result set. */
const RESULT_PARAMS = ['sort', 'facet', 'cat_id', 'min_price', 'max_price'] as const;

export function isWalmartSearchUrl(url: URL): boolean {
  const onStore = url.protocol === 'https:' && url.hostname === 'www.walmart.com';
  const onFixture = url.origin === E2E_ORIGIN;
  return (onStore || onFixture) && (url.pathname === '/search' || url.pathname.startsWith('/search/'));
}

export function readWalmartQuery(url: URL): QueryInfo | null {
  if (!isWalmartSearchUrl(url)) return null;
  const query = url.searchParams.get('q');
  if (!query || !query.trim()) return null;
  return {
    query: query.trim(),
    params: pickParams(url, RESULT_PARAMS),
    page: pageParam(url.searchParams.get('page')),
  };
}
