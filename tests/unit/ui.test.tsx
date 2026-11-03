// @vitest-environment happy-dom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, applySettingsPatch } from '../../src/core/settings';
import type { ScanSummary } from '../../src/core/cluster/groups';
import type { Settings } from '../../src/core/types';
import { emptyCounter, recordReads } from '../../src/core/net';
import { Pill } from '../../src/overlay/Pill';
import { fontCss, installFonts, FONT_STYLE_ID } from '../../src/overlay/fonts';
import type { TabSummary } from '../../src/messaging/protocol';
import type { PopupApi } from '../../src/ui/api';
import { Options } from '../../src/ui/Options';
import { Popup } from '../../src/ui/Popup';

beforeAll(() => {
  // happy-dom's Animation cancels with an AbortError; Motion's visual effects are not under test here.
  MotionGlobalConfig.skipAnimations = true;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(el: ReactElement): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(el);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function fakeApi(over: Partial<PopupApi> = {}) {
  let settings: Settings = DEFAULT_SETTINGS;
  const api: PopupApi = {
    getSettings: async () => settings,
    setSettings: vi.fn(async (patch) => (settings = applySettingsPatch(settings, patch))),
    getNetworkCounter: async () =>
      recordReads(emptyCounter(), [
        { kind: 'read', host: 'm.media-amazon.com', fromCache: false },
        { kind: 'read', host: 'm.media-amazon.com', fromCache: true },
      ]),
    getActiveTabSummary: async () => null,
    clearSessions: vi.fn(async () => ({ undoToken: 'tok' })),
    undoClearSessions: vi.fn(async () => true),
    sendCommand: vi.fn(async () => true),
    openShortcutsPage: vi.fn(async () => undefined),
    openOptions: vi.fn(async () => undefined),
    getVersion: () => '0.1.0',
    ...over,
  };
  return api;
}

const click = async (el: Element | null) => {
  await act(async () => {
    (el as HTMLElement).click();
  });
};
const flush = () => act(async () => new Promise<void>((r) => setTimeout(r, 0)));

describe('Popup (AC-F9.1 to AC-F9.3)', () => {
  it('tells an unsupported page what to open (AC-F9.2)', async () => {
    const el = await mount(<Popup api={fakeApi()} />);
    expect(el.textContent).toContain('Factory Twins works on Amazon.com and Walmart.com search results.');
    expect(el.querySelectorAll('a[href^="https://www."]')).toHaveLength(2);
    expect(el.querySelector('[data-testid="page-counts"]')).toBeNull();
  });

  it('shows this page counts when a supported page has reported (AC-F9.1)', async () => {
    const api = fakeApi({
      getActiveTabSummary: async () => ({
        status: 'ready' as const,
        store: 'amazon-us' as const,
        listings: 60,
        products: 47,
        twinGroups: 6,
        maxBrandTaxDollars: 23,
      }),
    });
    const el = await mount(<Popup api={api} />);
    const counts = el.querySelector('[data-testid="page-counts"]')?.textContent ?? '';
    expect(counts).toContain('Listings60');
    expect(counts).toContain('Products47');
    expect(counts).toContain('Twin groups6');
    expect(counts).toContain('Largest brand tax$23.00');
    expect(el.textContent).toContain('On for Amazon');
    expect(el.textContent).not.toContain('Open a search page');
  });

  it('shows the measured reads, not a fixed string (AC-F9.3)', async () => {
    const el = await mount(<Popup api={fakeApi()} />);
    expect(el.textContent).toContain('Nothing leaves your device.');
    expect(el.querySelector('[data-testid="reads"]')?.textContent).toBe(
      '2 image reads this session, all from m.media-amazon.com. 0 to anyone else.',
    );
  });

  it('switches a store off and on through the background', async () => {
    const api = fakeApi();
    const el = await mount(<Popup api={api} />);
    const switches = el.querySelectorAll('button[role="switch"]');
    expect(switches).toHaveLength(2);
    expect(switches[0]?.getAttribute('aria-checked')).toBe('true');
    await click(switches[1] ?? null);
    await flush();
    expect(api.setSettings).toHaveBeenCalledWith({ stores: { 'walmart-us': false } });
    expect(el.querySelectorAll('button[role="switch"]')[1]?.getAttribute('aria-checked')).toBe('false');
    expect(el.textContent).toContain('Off on Walmart');
  });

  it('clears the session and offers an undo (AC-F8.3)', async () => {
    const api = fakeApi();
    const el = await mount(<Popup api={api} />);
    await click(
      [...el.querySelectorAll('button')].find((b) => b.textContent === 'Clear this session') ?? null,
    );
    await flush();
    expect(api.clearSessions).toHaveBeenCalled();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Session cleared');
    await click([...el.querySelectorAll('button')].find((b) => b.textContent === 'Undo') ?? null);
    await flush();
    expect(api.undoClearSessions).toHaveBeenCalledWith('tok');
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('says so when settings cannot be read', async () => {
    const api = fakeApi({ getSettings: async () => Promise.reject(new Error('no background')) });
    const el = await mount(<Popup api={api} />);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load settings");
  });
});

describe('Popup page states (DESIGN.md, Popup)', () => {
  const tab = (summary: TabSummary) => fakeApi({ getActiveTabSummary: async () => summary });

  it('follows the scan: skeleton values, the live count, actions held back', async () => {
    const el = await mount(
      <Popup api={tab({ status: 'scanning', store: 'amazon-us', done: 24, total: 60 })} />,
    );
    expect(el.textContent).toContain('Checking photos… 24/60');
    expect(el.querySelector('[data-testid="page-counts"]')).toBeNull();
    const primary = [...el.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Show twins'));
    expect(primary?.hasAttribute('disabled')).toBe(true);
    expect(primary?.getAttribute('title')).toBe('Available once the photos are checked.');
  });

  it('says what failed and offers the layout report, with no page content in it', async () => {
    const el = await mount(<Popup api={tab({ status: 'error', store: 'walmart-us', adapterVersion: 1 })} />);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't read this page's listings.");
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent === 'Report layout');
    expect(link?.getAttribute('href')).toContain('Store%3A+walmart-us');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(el.querySelector('[data-testid="page-counts"]')).toBeNull();
    // The store switch still works in this state.
    expect(el.querySelectorAll('button[role="switch"]')).toHaveLength(1);
  });

  it('shows one row and a switch when the store is off, and no stats', async () => {
    const api = fakeApi({
      getActiveTabSummary: async () => ({ status: 'off' as const, store: 'amazon-us' as const }),
      getSettings: async () => applySettingsPatch(DEFAULT_SETTINGS, { stores: { 'amazon-us': false } }),
    });
    const el = await mount(<Popup api={api} />);
    expect(el.textContent).toContain('Off on Amazon');
    expect(el.querySelectorAll('button[role="switch"]')).toHaveLength(1);
    expect(el.querySelector('[data-testid="page-counts"]')).toBeNull();
    expect([...el.querySelectorAll('button')].some((b) => b.textContent?.startsWith('Show twins'))).toBe(
      false,
    );
  });

  it('explains a missing pill when the store is on but the summary pill setting is off', async () => {
    const api = fakeApi({
      getActiveTabSummary: async () => ({ status: 'off' as const, store: 'amazon-us' as const }),
      getSettings: async () => applySettingsPatch(DEFAULT_SETTINGS, { autoPill: false }),
    });
    const el = await mount(<Popup api={api} />);
    expect(el.textContent).toContain('The summary pill is turned off in Settings');
  });
});

describe('Options (AC-F10.1)', () => {
  it('lists every setting the spec names', async () => {
    const el = await mount(<Options api={fakeApi()} />);
    for (const label of [
      'Amazon',
      'Walmart',
      'Show the summary pill automatically',
      'Ring twins automatically',
      'Remember twins across pages',
      'Single-key shortcuts',
      'Standard',
      'Strict',
    ]) {
      expect(el.textContent, label).toContain(label);
    }
  });

  it('shows the defaults and writes a change', async () => {
    const api = fakeApi();
    const el = await mount(<Options api={api} />);
    const state = [...el.querySelectorAll('label')].map((l) => [
      l.querySelector('span span')?.textContent,
      l.querySelector('button[role="switch"]')?.getAttribute('aria-checked'),
    ]);
    expect(state).toContainEqual(['Ring twins automatically', 'false']);
    expect(state).toContainEqual(['Remember twins across pages', 'true']);
    const label = [...el.querySelectorAll('label')].find((l) =>
      l.textContent?.startsWith('Ring twins automatically'),
    );
    await click(label?.querySelector('button[role="switch"]') ?? null);
    await flush();
    expect(api.setSettings).toHaveBeenCalledWith({ autoRings: true });
  });

  it('writes the matching strictness', async () => {
    const api = fakeApi();
    const el = await mount(<Options api={api} />);
    const strict = [...el.querySelectorAll('button[role="radio"]')][1] as HTMLElement;
    await click(strict);
    await flush();
    expect(api.setSettings).toHaveBeenCalledWith({ strictness: 'strict' });
  });
});

describe('Pill (AC-F4.1, AC-F4.2, AC-F4.4)', () => {
  const summary: ScanSummary = {
    listings: 60,
    products: 47,
    twinGroups: 6,
    maxBrandTaxDollars: 23,
    pages: [1],
  };
  const actions = () => ({ onToggleRings: vi.fn(), onToggleFold: vi.fn(), onDismiss: vi.fn() });
  const base = { ringsOn: false, folded: false, reportUrl: 'https://github.com/x/y/issues/new' };

  it('shows the result with drawn dividers and the spoken name', async () => {
    const el = await mount(<Pill {...base} state={{ kind: 'result', summary }} actions={actions()} />);
    const body = el.querySelector('.ft-pill-body');
    // The spoken name is the visible words with commas (AC-F4.1); the arrow and dividers are drawn.
    expect(body?.getAttribute('aria-label')).toBe(
      '60 listings, 47 products, 6 twin groups, up to $23 brand tax',
    );
    expect(body?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '60 listings 47 products 6 twin groups up to $23 brand tax',
    );
    expect(el.querySelectorAll('.ft-divider')).toHaveLength(2);
    expect(el.textContent).not.toContain('·');
  });

  it('rings on click and offers fold only once rings are on', async () => {
    const a = actions();
    const el = await mount(<Pill {...base} state={{ kind: 'result', summary }} actions={a} />);
    expect(el.querySelector('.ft-secondary')).toBeNull();
    await click(el.querySelector('.ft-pill-body'));
    expect(a.onToggleRings).toHaveBeenCalledTimes(1);
    await act(async () =>
      root?.render(<Pill {...base} ringsOn state={{ kind: 'result', summary }} actions={a} />),
    );
    expect(el.querySelector('.ft-secondary')?.textContent).toContain('Fold twins');
    await click(el.querySelector('.ft-secondary'));
    expect(a.onToggleFold).toHaveBeenCalledTimes(1);
  });

  it('labels the fold button Unfold twins when folded', async () => {
    const el = await mount(
      <Pill {...base} ringsOn folded state={{ kind: 'result', summary }} actions={actions()} />,
    );
    expect(el.querySelector('.ft-secondary')?.textContent).toContain('Unfold twins');
  });

  it('can be dismissed', async () => {
    const a = actions();
    const el = await mount(<Pill {...base} state={{ kind: 'result', summary }} actions={a} />);
    await click(el.querySelector('.ft-icon-button'));
    expect(a.onDismiss).toHaveBeenCalled();
  });

  it('shows scanning, no-twins and error states', async () => {
    const a = actions();
    const el = await mount(<Pill {...base} state={{ kind: 'scanning', done: 24, total: 60 }} actions={a} />);
    expect(el.textContent).toContain('Checking 60 photos… 24/60');
    await act(async () =>
      root?.render(
        <Pill {...base} state={{ kind: 'no-twins', summary: { ...summary, twinGroups: 0 } }} actions={a} />,
      ),
    );
    expect(el.textContent).toContain('60 listings, no shared photos on this page');
    await act(async () =>
      root?.render(<Pill {...base} state={{ kind: 'error', reason: 'unreadable-tiles' }} actions={a} />),
    );
    expect(el.textContent).toContain(
      "Couldn't read this page's listings. The store may have changed its layout.",
    );
    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toBe('Report layout');
    expect(link.href).toBe(base.reportUrl);
    expect(link.rel).toContain('noopener');
  });

  it('renders nothing for idle, paused and dismissed', async () => {
    for (const kind of ['idle', 'paused', 'dismissed'] as const) {
      const el = await mount(<Pill {...base} state={{ kind }} actions={actions()} />);
      expect(el.innerHTML, kind).toBe('');
      await act(async () => root?.unmount());
      host?.remove();
    }
  });
});

describe('overlay fonts', () => {
  it('declares both families once, from extension URLs', () => {
    const resolve = (p: string) => `chrome-extension://abc${p}`;
    const css = fontCss(resolve);
    expect(css).toContain("font-family:'Rethink Sans Variable'");
    expect(css).toContain('chrome-extension://abc/fonts/rethink-sans-latin-wght.woff2');
    const remove = installFonts(document, resolve);
    installFonts(document, resolve);
    expect(document.querySelectorAll(`#${FONT_STYLE_ID}`)).toHaveLength(1);
    remove();
    expect(document.getElementById(FONT_STYLE_ID)).toBeNull();
  });
});
