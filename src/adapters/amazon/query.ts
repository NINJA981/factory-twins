import type { QueryInfo } from '../../core/session/queryKey';
import { E2E_ORIGIN } from '../matches';
import { pageParam, pickParams } from '../listing';

/** Parameters that change Amazon's result set: sort, refinements, department, price filters. */
const RESULT_PARAMS = ['s', 'rh', 'i', 'bbn', 'low-price', 'high-price'] as const;

export function isAmazonSearchUrl(url: URL): boolean {
  const onStore = url.protocol === 'https:' && url.hostname === 'www.amazon.com';
  const onFixture = url.origin === E2E_ORIGIN;
  return (onStore || onFixture) && (url.pathname === '/s' || url.pathname.startsWith('/s/'));
}

export function readAmazonQuery(url: URL): QueryInfo | null {
  if (!isAmazonSearchUrl(url)) return null;
  const query = url.searchParams.get('k') ?? url.searchParams.get('field-keywords');
  if (!query || !query.trim()) return null;
  return {
    query: query.trim(),
    params: pickParams(url, RESULT_PARAMS),
    page: pageParam(url.searchParams.get('page')),
  };
}
