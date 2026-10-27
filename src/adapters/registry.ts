import type { StoreId } from '../core/types';
import { amazonAdapter } from './amazon/index';
import type { StoreAdapter } from './types';
import { walmartAdapter } from './walmart/index';

export const ADAPTERS: Record<StoreId, StoreAdapter> = {
  'amazon-us': amazonAdapter,
  'walmart-us': walmartAdapter,
};

export function adapterForUrl(href: string): StoreAdapter | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  for (const a of Object.values(ADAPTERS)) if (a.matches(url)) return a;
  return null;
}
