// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoordinator } from '../../src/background/coordinator';
import { amazonAdapter } from '../../src/adapters/amazon/index';
import { readPage } from '../../src/adapters/read';
import { createController, type Controller, type ControllerClient } from '../../src/content/controller';
import { cluster } from '../../src/core/cluster/groups';
import type { ImageHashes } from '../../src/core/types';
import type { HashOutcome, Hasher } from '../../src/hasher/types';
import { createMemoryArea } from '../../src/storage/kv';
import { fixtureDocument, fixtureUrl, loadFixtures, type Fixture } from './helpers/fixtures';

const fixture = loadFixtures('amazon-us').find((f) => f.slug === 'laptop-stand') as Fixture;
const PAGE_1 = fixtureUrl(fixture);
const PAGE_2 = PAGE_1.replace('page=1', 'page=2');

/**
 * Page 2 = page 1 with fresh ASINs and different brand names but the same photos, so groups span
 * both pages. (Same brand and title on a new ASIN would be a variant family, not a twin.)
 */
function makePage2(): string {
  const r = readPage(amazonAdapter, fixtureDocument(fixture), fixtureUrl(fixture));
  if (!r.ok) throw new Error('fixture unreadable');
  let html = fixture.html.replace(/B0([A-Z0-9]{8})/g, 'B1$1');
  for (const brand of new Set(
    r.listings.map((l) => l.brand).filter((b): b is string => !!b && b.length > 2),
  )) {
    html = html.split(brand).join(`${brand}Q`);
  }
  return html;
}
const page2Html = makePage2();

function load(html: string): void {
  document.documentElement.innerHTML = html.replace(/^<!doctype html>/i, '');
}

/** A hasher backed by hashes.json: URL in, the listing's stored hashes out. */
function fixtureHasher() {
  const byUrl = new Map<string, ImageHashes>();
  const first = readPage(amazonAdapter, document, PAGE_1);
  void first;
  const seen: string[] = [];
  const hash = vi.fn(async ({ urls }: { urls: string[] }): Promise<HashOutcome[]> => {
    seen.push(...urls);
    return urls.map((url): HashOutcome => {
      const h = byUrl.get(url);
      return h
        ? { url, ok: true, hashes: h, record: { kind: 'read', host: 'm.media-amazon.com', fromCache: false } }
        : { url, ok: false, error: 'http', record: null };
    });
  });
  const hasher: Hasher = { hash, diff: vi.fn() as never };
  return { hasher, hash, seen, byUrl };
}

function setup(html = fixture.html, href: string | (() => string) = PAGE_1) {
  load(html);
  const fh = fixtureHasher();
  // Index hashes by the image URL the adapter reads, for both page variants.
  for (const [h, doc] of [
    [PAGE_1, fixture.html],
    [PAGE_2, page2Html],
  ] as const) {
    load(doc);
    const r = readPage(amazonAdapter, document, h);
    if (r.ok)
      for (const l of r.listings)
        fh.byUrl.set(l.imageUrl, fixture.hashes[l.id.replace(/^B1/, 'B0')] as ImageHashes);
  }
  load(html);
  const session = createMemoryArea();
  const local = createMemoryArea();
  const coordinator = createCoordinator({ session, local, hasher: fh.hasher });
  const reportSummary = vi.fn(async () => undefined);
  const client: ControllerClient = {
    hashImages: (req) => coordinator.hashImages(req),
    mergeQuerySession: (scan) => coordinator.mergeQuerySession(scan),
    commitLetters: (data) => coordinator.commitLetters(data),
    getSettings: () => coordinator.getSettings(),
    reportSummary,
    pixelDiff: (req) => coordinator.pixelDiff(req),
  };
  const controller = createController({
    adapter: amazonAdapter,
    doc: document,
    href,
    client,
    lazyDebounceMs: 5,
  });
  return { controller, coordinator, reportSummary, ...fh };
}

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: k, bubbles: true, ...init });
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

let active: Controller | null = null;
beforeEach(() => {
  active = null;
});
afterEach(() => {
  active?.stop();
  document.body.innerHTML = '';
});

describe('content controller', () => {
  it('scans on start and ends on the result pill the engine would compute', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    const state = s.controller.getState();
    expect(state.pill.kind).toBe('result');
    const direct = cluster({
      listings: readPageListings(),
      hashes: fixture.hashes,
    }).summary;
    expect(state.pill.kind === 'result' && state.pill.summary).toEqual(direct);
    expect(s.reportSummary).toHaveBeenCalledWith({
      status: 'ready',
      store: 'amazon-us',
      listings: direct.listings,
      products: direct.products,
      twinGroups: direct.twinGroups,
      maxBrandTaxDollars: direct.maxBrandTaxDollars,
    });
  });

  it('shows progress while the photos are read', async () => {
    const s = setup();
    active = s.controller;
    const seen: string[] = [];
    s.controller.subscribe(() => seen.push(s.controller.getState().pill.kind));
    await s.controller.start();
    expect(seen).toContain('scanning');
    expect(seen[seen.length - 1]).toBe('result');
  });

  it('does nothing, and says nothing, when the store is switched off (AC-F4.2 paused)', async () => {
    const s = setup();
    active = s.controller;
    await s.coordinator.setSettings({ stores: { 'amazon-us': false } });
    await s.controller.start();
    expect(s.controller.getState().pill.kind).toBe('paused');
    expect(s.hash).not.toHaveBeenCalled();
  });

  it('does nothing when the pill is switched off', async () => {
    const s = setup();
    active = s.controller;
    await s.coordinator.setSettings({ autoPill: false });
    await s.controller.start();
    expect(s.controller.getState().pill.kind).toBe('paused');
    expect(s.hash).not.toHaveBeenCalled();
  });

  it('degrades to the error state when the store layout changed, without throwing (AC-F1.6)', async () => {
    const s = setup('<html><body><div id="search"><p>Totally new layout</p></div></body></html>');
    active = s.controller;
    await expect(s.controller.start()).resolves.toBeUndefined();
    expect(s.controller.getState().pill).toEqual({ kind: 'error', reason: 'no-results-container' });
  });

  it('reports unreadable tiles when tiles exist but none can be read', async () => {
    const s = setup(
      '<html><body><div class="s-main-slot"><div data-component-type="s-search-result" data-asin="B0ABCDEFGH"><span>no title or image</span></div></div></body></html>',
    );
    active = s.controller;
    await s.controller.start();
    expect(s.controller.getState().pill).toEqual({ kind: 'error', reason: 'unreadable-tiles' });
  });

  it('reports a hasher failure when no photo can be read', async () => {
    const s = setup();
    active = s.controller;
    s.byUrl.clear();
    await s.controller.start();
    expect(s.controller.getState().pill).toEqual({ kind: 'error', reason: 'hasher-failed' });
  });

  it('tells the popup each state it passes through: scanning, ready, off, error (DESIGN.md popup states)', async () => {
    const ok = setup();
    active = ok.controller;
    await ok.controller.start();
    const calls = ok.reportSummary.mock.calls as unknown as Array<[{ status: string }]>;
    const statuses = calls.map((c) => c[0].status);
    expect(statuses[0]).toBe('scanning');
    expect(statuses[statuses.length - 1]).toBe('ready');
    ok.controller.applySettings({
      ...(await ok.coordinator.getSettings()),
      stores: { 'amazon-us': false, 'walmart-us': true },
    });
    expect(calls[calls.length - 1]?.[0]).toEqual({ status: 'off', store: 'amazon-us' });
    ok.controller.stop();

    const bad = setup('<html><body><div id="search"><p>Totally new layout</p></div></body></html>');
    active = bad.controller;
    await bad.controller.start();
    expect(bad.reportSummary).toHaveBeenCalledWith({
      status: 'error',
      store: 'amazon-us',
      adapterVersion: amazonAdapter.version,
    });
  });

  it('picks up tiles that load later and hashes only the new photos (AC-F1.3)', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    const before = s.seen.length;
    const listingsBefore = s.controller.getState().result?.summary.listings ?? 0;
    const container = document.querySelector('.s-main-slot') as Element;
    const lazy = document.createElement('div');
    lazy.innerHTML =
      fixture.html
        .match(
          /<div role="listitem" data-asin="B0[A-Z0-9]{8}"[\s\S]*?<\/div><\/div><\/div><\/div><\/div>/,
        )?.[0]
        ?.replace(/B0([A-Z0-9]{8})/g, 'B9$1') ?? '';
    const tile = lazy.firstElementChild as Element;
    expect(tile).toBeTruthy();
    // Same photo URL as an existing tile, new ASIN: no new image to hash.
    container.append(tile);
    await tick(80);
    expect(s.controller.getState().result?.summary.listings).toBe(listingsBefore + 1);
    expect(s.seen.length).toBe(before);
  });

  it('joins page 2 to page 1 and numbers groups the same on both (SPEC F8)', async () => {
    const one = setup();
    await one.controller.start();
    const lettersOnePageOne = one.controller.getState().result?.groups.map((g) => g.letter);
    one.controller.stop();

    // Second page, same browser session: reuse the storage and coordinator of page 1.
    load(page2Html);
    const client: ControllerClient = {
      hashImages: (req) => one.coordinator.hashImages(req),
      mergeQuerySession: (scan) => one.coordinator.mergeQuerySession(scan),
      commitLetters: (data) => one.coordinator.commitLetters(data),
      getSettings: () => one.coordinator.getSettings(),
      reportSummary: async () => undefined,
      pixelDiff: (req) => one.coordinator.pixelDiff(req),
    };
    const two = createController({ adapter: amazonAdapter, doc: document, href: PAGE_2, client });
    active = two;
    await two.start();
    const state = two.getState();
    expect(state.page).toBe(2);
    expect(state.result?.summary.pages).toEqual([1, 2]);
    expect(state.result?.summary.listings).toBe(fixture.labels.tiles * 2);
    expect(state.result?.groups.every((g) => g.pagesSeen.length === 2)).toBe(true);
    // Every photo now appears twice, so single listings pair up with their copies and new groups
    // appear; the groups seen on page 1 keep their letters and are not renumbered.
    const lettersTwo = state.result?.groups.map((g) => g.letter) ?? [];
    for (const letter of lettersOnePageOne ?? []) expect(lettersTwo).toContain(letter);
    expect(new Set(lettersTwo).size).toBe(lettersTwo.length);
  });

  it('turns rings and fold on and off from the keyboard (AC-F5.1, AC-F5.5, AC-F12.1)', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    expect(s.controller.handleKeydown(key('t'))).toBe(true);
    expect(s.controller.getState().overlay.rings).toBe(true);
    expect(s.controller.handleKeydown(key('f'))).toBe(true);
    expect(s.controller.getState().overlay.folded).toBe(true);
    expect(s.controller.handleKeydown(key('p'))).toBe(true);
    expect(s.controller.getState().overlay.lens).not.toBeNull();
    expect(s.controller.handleKeydown(key('Escape'))).toBe(true);
    expect(s.controller.getState().overlay.lens).toBeNull();
    expect(s.controller.handleKeydown(key('Escape'))).toBe(false); // the store keeps Esc
    s.controller.handleKeydown(key('t'));
    expect(s.controller.getState().overlay.rings).toBe(false);
  });

  it('leaves keys alone while the shopper types in a text field', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    const input = document.createElement('input');
    input.type = 'text';
    document.body.append(input);
    input.focus();
    expect(s.controller.handleKeydown(key('t'))).toBe(false);
    expect(s.controller.getState().overlay.rings).toBe(false);
  });

  it('ignores shortcuts when single keys are off, but still obeys the manifest commands', async () => {
    const s = setup();
    active = s.controller;
    await s.coordinator.setSettings({ singleKeys: false });
    await s.controller.start();
    expect(s.controller.handleKeydown(key('t'))).toBe(false);
    s.controller.runCommand('ring-twins');
    expect(s.controller.getState().overlay.rings).toBe(true);
    s.controller.runCommand('unknown-command');
  });

  it('rings automatically when that setting is on (AC-F10.1)', async () => {
    const s = setup();
    active = s.controller;
    await s.coordinator.setSettings({ autoRings: true });
    await s.controller.start();
    expect(s.controller.getState().overlay.rings).toBe(true);
  });

  it('applies new settings without a reload (AC-F10.2)', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    const settings = await s.coordinator.setSettings({ stores: { 'amazon-us': false } });
    s.controller.applySettings(settings);
    expect(s.controller.getState().pill.kind).toBe('paused');
    expect(s.controller.getState().overlay.rings).toBe(false);
    const on = await s.coordinator.setSettings({ stores: { 'amazon-us': true } });
    s.controller.applySettings(on);
    await tick(50);
    expect(s.controller.getState().pill.kind).toBe('result');
  });

  it('stays dismissed after the shopper hides the pill (AC-F4.4)', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    s.controller.pill({ type: 'dismiss' });
    await s.controller.rescan();
    expect(s.controller.getState().pill.kind).toBe('dismissed');
  });

  it('does not touch the store page: no attribute or node is added to the grid', async () => {
    const s = setup();
    active = s.controller;
    const before = document.body.innerHTML;
    await s.controller.start();
    s.controller.runAction('toggle-rings');
    expect(document.body.innerHTML).toBe(before);
  });

  it('starts over when the store routes to a new search without a reload', async () => {
    let href = PAGE_1;
    const s = setup(fixture.html, () => href);
    active = s.controller;
    await s.controller.start();
    expect(s.controller.checkPage()).toBe('unchanged');
    s.controller.runAction('toggle-rings');

    // Client-side routing: new query, new tiles, same document, no new content script.
    load(page2Html);
    href = PAGE_1.replace(/k=[^&]+/, 'k=desk+riser');
    expect(s.controller.checkPage()).toBe('navigated');
    expect(s.controller.getState().overlay.rings).toBe(false);
    await tick(80);
    const state = s.controller.getState();
    // Only the new search's tiles: nothing merged into the old query's session.
    expect(state.result?.summary.listings).toBe(fixture.labels.tiles);
    expect(state.result?.summary.pages).toEqual([1]);
    expect(Object.keys(state.session?.listings ?? {}).every((id) => id.startsWith('B1'))).toBe(true);
  });

  it('watches the new results list when the store replaces it in place', async () => {
    const s = setup();
    active = s.controller;
    await s.controller.start();
    const old = document.querySelector('.s-main-slot') as Element;
    old.replaceWith(old.cloneNode(true));
    expect(s.controller.checkPage()).toBe('reattached');
    await tick(80);
    const tiles = [...s.controller.getState().tilesById.values()];
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((t) => t.isConnected)).toBe(true);
    expect(s.controller.checkPage()).toBe('unchanged');
  });

  it('stays quiet on a store page that is not a search (no false layout alarm)', async () => {
    const s = setup(fixture.html, 'https://www.amazon.com/stores/page/0A1B2C3D');
    active = s.controller;
    await s.controller.start();
    expect(s.controller.getState().pill.kind).toBe('idle');
    expect(s.hash).not.toHaveBeenCalled();
  });

  it('stays quiet on a search with no results', async () => {
    const s = setup(
      '<html><body><div class="s-main-slot"><p>No results for this search.</p></div></body></html>',
    );
    active = s.controller;
    await s.controller.start();
    expect(s.controller.getState().pill.kind).toBe('idle');
  });
});

function readPageListings() {
  const r = readPage(amazonAdapter, document, PAGE_1);
  if (!r.ok) throw new Error('unreadable');
  return r.listings;
}
