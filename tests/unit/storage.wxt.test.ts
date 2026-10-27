import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCoordinator } from '../../src/background/coordinator';
import { wxtArea } from '../../src/storage/wxtArea';
import type { Hasher } from '../../src/hasher/types';

// The real storage adapter over WXT's fake browser: this is the path the extension uses, so the
// "settings in local, everything else in session" rule (SPEC section 10) is tested end to end.

const noHasher: Hasher = {
  hash: async () => [],
  diff: async () => ({ ok: false, error: 'network', records: [] }),
};

beforeEach(() => {
  fakeBrowser.reset();
});

describe('wxtArea over chrome.storage', () => {
  it('round-trips values and removes keys', async () => {
    const area = wxtArea('session');
    expect(await area.get('x')).toBeNull();
    await area.set('x', { a: [1, 2, 3] });
    expect(await area.get('x')).toEqual({ a: [1, 2, 3] });
    await area.remove(['x']);
    expect(await area.get('x')).toBeNull();
    await area.remove([]);
  });

  it('lists only the keys of its own area, without the storage library bookkeeping', async () => {
    const session = wxtArea('session');
    const local = wxtArea('local');
    await session.set('a', 1);
    await session.set('b', 2);
    await local.set('c', 3);
    expect((await session.keys()).sort()).toEqual(['a', 'b']);
    expect(await local.keys()).toEqual(['c']);
  });

  it('writes to the browser areas the privacy table promises', async () => {
    const c = createCoordinator({ session: wxtArea('session'), local: wxtArea('local'), hasher: noHasher });
    await c.setSettings({ autoRings: true });
    await c.reportTabSummary(3, {
      store: 'amazon-us',
      listings: 1,
      products: 1,
      twinGroups: 0,
      maxBrandTaxDollars: null,
    });
    const local = await fakeBrowser.storage.local.get(null);
    const session = await fakeBrowser.storage.session.get(null);
    expect(Object.keys(local).some((k) => k.includes('settings'))).toBe(true);
    expect(Object.keys(local).some((k) => k.includes('tab:'))).toBe(false);
    expect(Object.keys(session).some((k) => k.includes('tab:3'))).toBe(true);
    expect(Object.keys(session).some((k) => k.includes('settings'))).toBe(false);
  });

  it('survives a coordinator restart (the service worker was killed)', async () => {
    const make = () =>
      createCoordinator({ session: wxtArea('session'), local: wxtArea('local'), hasher: noHasher });
    await make().setSettings({ strictness: 'strict' });
    expect((await make().getSettings()).strictness).toBe('strict');
  });
});
