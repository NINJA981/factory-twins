// @vitest-environment happy-dom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, applySettingsPatch } from '../../src/core/settings';
import type { ScanSummary } from '../../src/core/cluster/groups';
import type { Settings } from '../../src/core/types';
import { emptyCounter, recordReads } from '../../src/core/net';
import { Pill } from '../../src/overlay/Pill';
import { fontCss, installFonts, FONT_STYLE_ID } from '../../src/overlay/fonts';
import type { PopupApi } from '../../src/ui/api';
import { Options } from '../../src/ui/Options';
import { Popup } from '../../src/ui/Popup';

beforeAll(() => {
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
        store: 'amazon-us',
        listings: 60,
        products: 37,
        twinGroups: 6,
        maxBrandTaxDollars: 18,
      }),
    });
    const el = await mount(<Popup api={api} />);
    expect(el.querySelector('[data-testid="page-counts"]')?.textContent).toContain(
      '60 listings, 37 products, 6 twin groups',
    );
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
      l.textContent,
      l.querySelector('button[role="switch"]')?.getAttribute('aria-checked'),
    ]);
    expect(state).toContainEqual(['Ring twins automatically', 'false']);
    expect(state).toContainEqual(['Remember twins across pages', 'true']);
    const label = [...el.querySelectorAll('label')].find((l) => l.textContent === 'Ring twins automatically');
    await click(label?.querySelector('button[role="switch"]') ?? null);
    await flush();
    expect(api.setSettings).toHaveBeenCalledWith({ autoRings: true });
  });

  it('writes the matching strictness', async () => {
    const api = fakeApi();
    const el = await mount(<Options api={api} />);
    const strict = [...el.querySelectorAll('input[type="radio"]')][1] as HTMLInputElement;
    await click(strict);
    await flush();
    expect(api.setSettings).toHaveBeenCalledWith({ strictness: 'strict' });
  });
});

describe('Pill (AC-F4.1, AC-F4.2, AC-F4.4)', () => {
  const summary: ScanSummary = {
    listings: 60,
    products: 37,
    twinGroups: 6,
    maxBrandTaxDollars: 18,
    pages: [1],
  };
  const actions = () => ({ onToggleRings: vi.fn(), onToggleFold: vi.fn(), onDismiss: vi.fn() });
  const base = { ringsOn: false, folded: false, reportUrl: 'https://github.com/x/y/issues/new' };

  it('shows the result with drawn dividers and the spoken name', async () => {
    const el = await mount(<Pill {...base} state={{ kind: 'result', summary }} actions={actions()} />);
    const body = el.querySelector('.ft-pill-body');
    expect(body?.textContent).toBe('60 listings → 37 products6 twin groupsup to $18 brand tax');
    expect(body?.getAttribute('aria-label')).toBe(
      '60 listings, 37 products, 6 twin groups, up to 18 dollars brand tax. Show twins.',
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
