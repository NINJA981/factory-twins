import { describe, expect, it, vi } from 'vitest';
import config from '../../wxt.config';
import { E2E_ORIGIN, contentScriptMatches, originPattern } from '../../src/adapters/matches';
import {
  createOffscreenHasher,
  OFFSCREEN_IDLE_MS,
  type OffscreenApi,
} from '../../src/hasher/chromeOffscreen';
import { cacheStatusFromTiming } from '../../src/hasher/decode';
import { checkImageUrl, hostPermissionPatterns, IMAGE_HOSTS } from '../../src/hasher/allowlist';
import { IMAGE_FETCH_INIT, MAX_IMAGE_BYTES, readImage } from '../../src/hasher/fetchPixels';
import { createHashService } from '../../src/hasher/service';
import type { DecodeImage, ReadResult } from '../../src/hasher/types';
import { hashImage } from '../../src/core/hash/index';
import type { Timers } from '../../src/core/async';
import { decodeRgba, encodeOriginal, renderPhoto } from '../../scripts/lib/synth';

const AMAZON_URL = 'https://m.media-amazon.com/images/I/abc._AC_UL320_.jpg';
const WALMART_URL = 'https://i5.walmartimages.com/seo/abc.jpeg?odnHeight=180';

describe('image host allowlist (AC-F2.4)', () => {
  it('accepts the store image hosts over https', () => {
    expect(checkImageUrl(AMAZON_URL, 'amazon-us')).toMatchObject({ ok: true, host: 'm.media-amazon.com' });
    expect(checkImageUrl('https://images-na.ssl-images-amazon.com/images/I/x.jpg', 'amazon-us').ok).toBe(
      true,
    );
    expect(checkImageUrl(WALMART_URL, 'walmart-us')).toMatchObject({
      ok: true,
      host: 'i5.walmartimages.com',
    });
  });

  it('is case-insensitive about the host', () => {
    expect(checkImageUrl('https://M.MEDIA-AMAZON.COM/a.jpg', 'amazon-us').ok).toBe(true);
  });

  it.each([
    ['plain http', 'http://m.media-amazon.com/a.jpg'],
    ['another host', 'https://example.com/a.jpg'],
    ['a lookalike suffix', 'https://m.media-amazon.com.evil.example/a.jpg'],
    ['a lookalike prefix', 'https://evil-m.media-amazon.com/a.jpg'],
    ['a subdomain', 'https://x.m.media-amazon.com/a.jpg'],
    ['the other store host', WALMART_URL],
    ['a custom port', 'https://m.media-amazon.com:8443/a.jpg'],
    ['embedded credentials', 'https://user:pw@m.media-amazon.com/a.jpg'],
    ['a data URL', 'data:image/png;base64,AAAA'],
    ['a blob URL', 'blob:https://www.amazon.com/1234'],
    ['a file URL', 'file:///etc/passwd'],
    ['an IP address', 'https://127.0.0.1/a.jpg'],
  ])('refuses %s', (_name, url) => {
    expect(checkImageUrl(url, 'amazon-us').ok).toBe(false);
  });

  it('refuses garbage as invalid', () => {
    expect(checkImageUrl('not a url', 'amazon-us')).toEqual({ ok: false, reason: 'invalid-url' });
    expect(checkImageUrl('', 'amazon-us')).toEqual({ ok: false, reason: 'invalid-url' });
  });

  it('allows the local fixture server only when asked, and only from the e2e flag', () => {
    const local = `${E2E_ORIGIN}/img/a.jpg`;
    expect(checkImageUrl(local, 'amazon-us').ok).toBe(false);
    expect(checkImageUrl(local, 'amazon-us', { e2e: false }).ok).toBe(false);
    expect(checkImageUrl(local, 'amazon-us', { e2e: true }).ok).toBe(true);
  });

  it('derives the host permission list from the same table', () => {
    const release = hostPermissionPatterns();
    expect(release.sort()).toEqual(
      Object.values(IMAGE_HOSTS)
        .flat()
        .map((h) => `https://${h}/*`)
        .sort(),
    );
    expect(release.some((p) => p.includes('localhost'))).toBe(false);
    expect(hostPermissionPatterns({ e2e: true })).toContain(`${E2E_ORIGIN}/*`);
  });
});

describe('manifest (SPEC section 10, AC-F1.5)', () => {
  type ManifestFn = (env: { browser: string; mode: string }) => Record<string, unknown>;
  const manifest = (browser: string, mode = 'production') =>
    (config.manifest as unknown as ManifestFn)({ browser, mode });

  it('requests only storage and offscreen, and drops offscreen on Firefox', () => {
    expect(manifest('chrome').permissions).toEqual(['storage', 'offscreen']);
    expect(manifest('firefox').permissions).toEqual(['storage']);
  });

  it('keeps host permissions equal to the image allowlist', () => {
    expect(manifest('chrome').host_permissions).toEqual(hostPermissionPatterns());
    expect(manifest('firefox').host_permissions).toEqual(hostPermissionPatterns());
  });

  it('adds the fixture server only to the e2e build', () => {
    expect(JSON.stringify(manifest('chrome'))).not.toContain('localhost');
    expect(manifest('chrome', 'e2e').host_permissions).toContain(`${E2E_ORIGIN}/*`);
  });

  it('matches content scripts on the two search URLs only', () => {
    expect(contentScriptMatches('amazon-us', false)).toEqual(['https://www.amazon.com/s*']);
    expect(contentScriptMatches('walmart-us', false)).toEqual(['https://www.walmart.com/search*']);
    expect(contentScriptMatches('amazon-us', true)).toContain(`${E2E_ORIGIN}/s*`);
  });

  it('turns match patterns into origin patterns for web_accessible_resources', () => {
    expect(originPattern('https://www.amazon.com/s*')).toBe('https://www.amazon.com/*');
    expect(() => originPattern('nonsense')).toThrow();
  });

  it('declares both commands and the Firefox gecko id', () => {
    const m = manifest('chrome') as { commands: Record<string, unknown> };
    expect(Object.keys(m.commands).sort()).toEqual(['fold-twins', 'ring-twins']);
    const ff = manifest('firefox') as {
      browser_specific_settings: { gecko: { id: string; strict_min_version: string } };
    };
    expect(ff.browser_specific_settings.gecko.strict_min_version).toBe('140.0');
    expect(ff.browser_specific_settings.gecko.id).toMatch(/@/);
  });

  it('declares no tabs, scripting, webRequest or all-URLs access', () => {
    const text = JSON.stringify(manifest('chrome'));
    for (const banned of ['"tabs"', '"scripting"', '"webRequest"', '<all_urls>', '"activeTab"'])
      expect(text).not.toContain(banned);
  });
});

describe('readImage (SPEC F0, AC-F2.4)', () => {
  const png = async () => encodeOriginal(await renderPhoto({ seed: 1, silhouette: 'stand' }));
  const decode: DecodeImage = async (blob) => decodeRgba(Buffer.from(await blob.arrayBuffer()));
  const respond = (body: BodyInit, init: ResponseInit = {}) =>
    new Response(body, { status: 200, headers: { 'content-type': 'image/jpeg' }, ...init });

  it('fetches, decodes the blob and reports the host', async () => {
    const bytes = await png();
    const fetchMock = vi.fn(async () => respond(new Uint8Array(bytes)));
    const r = await readImage(AMAZON_URL, 'amazon-us', {
      fetch: fetchMock as never,
      decode,
      cacheStatus: () => true,
    });
    expect(r).toMatchObject({ ok: true, host: 'm.media-amazon.com', fromCache: true });
    if (r.ok) expect(r.image.width).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(AMAZON_URL, IMAGE_FETCH_INIT);
  });

  it('sends no cookies, no referrer, prefers the cache and refuses redirects', () => {
    expect(IMAGE_FETCH_INIT).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'force-cache',
      redirect: 'error',
    });
  });

  it('never calls fetch for a URL outside the allowlist', async () => {
    const fetchMock = vi.fn();
    for (const url of ['https://example.com/a.jpg', 'http://m.media-amazon.com/a.jpg', 'nope', WALMART_URL]) {
      const r = await readImage(url, 'amazon-us', { fetch: fetchMock as never, decode });
      expect(r.ok).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('classifies failures without throwing', async () => {
    const run = (res: () => Promise<Response>, dec: DecodeImage = decode) =>
      readImage(AMAZON_URL, 'amazon-us', { fetch: res as never, decode: dec });
    expect(await run(async () => respond('x', { status: 404 }))).toEqual({
      ok: false,
      error: 'http',
      host: 'm.media-amazon.com',
    });
    expect(
      await run(async () => {
        throw new TypeError('offline');
      }),
    ).toEqual({ ok: false, error: 'network', host: 'm.media-amazon.com' });
    expect(
      await run(async () => respond('<html>', { headers: { 'content-type': 'text/html' } })),
    ).toMatchObject({ error: 'not-image' });
    expect(
      await run(async () =>
        respond('x', {
          headers: { 'content-type': 'image/jpeg', 'content-length': String(MAX_IMAGE_BYTES + 1) },
        }),
      ),
    ).toMatchObject({ error: 'too-large' });
    expect(await run(async () => respond(new Uint8Array(MAX_IMAGE_BYTES + 1)))).toMatchObject({
      error: 'too-large',
    });
    expect(await run(async () => respond('not an image'))).toMatchObject({ error: 'decode' });
  });

  it('refuses a refused URL as blocked-looking errors with no host', async () => {
    const r = await readImage('https://example.com/a.jpg', 'amazon-us', { fetch: vi.fn() as never, decode });
    expect(r).toEqual({ ok: false, error: 'not-allowlisted', host: null });
  });
});

describe('hash service', () => {
  const image = async () =>
    decodeRgba(await encodeOriginal(await renderPhoto({ seed: 2, silhouette: 'jar' })));

  it('reads each distinct URL once and reports one record per read', async () => {
    const img = await image();
    const read = vi.fn(async (): Promise<ReadResult> => ({
      ok: true,
      image: img,
      host: 'm.media-amazon.com',
      fromCache: false,
    }));
    const out = await createHashService(read).hash({
      store: 'amazon-us',
      urls: [AMAZON_URL, AMAZON_URL, `${AMAZON_URL}?2`],
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(3);
    expect(out.map((o) => o.ok)).toEqual([true, true, true]);
    expect(out.filter((o) => o.record).length).toBe(2);
    expect(out[0]).toMatchObject({ ok: true, hashes: hashImage(img) });
  });

  it('counts refused URLs as blocked, failed requests against their host, and unknowns as nothing', async () => {
    const read = async (url: string): Promise<ReadResult> => {
      if (url.includes('blocked')) return { ok: false, error: 'not-allowlisted', host: null };
      if (url.includes('down')) return { ok: false, error: 'network', host: 'm.media-amazon.com' };
      return { ok: false, error: 'invalid-url', host: null };
    };
    const out = await createHashService(read).hash({
      store: 'amazon-us',
      urls: ['blocked', 'down', 'weird'],
    });
    expect(out.map((o) => o.record)).toEqual([
      { kind: 'blocked' },
      { kind: 'read', host: 'm.media-amazon.com', fromCache: null },
      { kind: 'blocked' },
    ]);
  });

  it('turns a decode crash into an error result instead of rejecting the batch', async () => {
    const read = async (): Promise<ReadResult> => ({
      ok: true,
      image: { width: 4, height: 4, data: new Uint8Array(3) },
      host: 'm.media-amazon.com',
      fromCache: null,
    });
    const out = await createHashService(read).hash({ store: 'amazon-us', urls: [AMAZON_URL] });
    expect(out[0]).toMatchObject({ ok: false, error: 'decode' });
  });

  it('measures how much two photos differ for the Proof lens', async () => {
    const img = await image();
    const read = async (): Promise<ReadResult> => ({
      ok: true,
      image: img,
      host: 'm.media-amazon.com',
      fromCache: null,
    });
    const same = await createHashService(read).diff({
      store: 'amazon-us',
      a: AMAZON_URL,
      b: `${AMAZON_URL}?other`,
    });
    expect(same).toMatchObject({ ok: true, result: { identicalTenths: 1000, differing: 0 } });
    const failing = await createHashService(async (): Promise<ReadResult> => ({
      ok: false,
      error: 'http',
      host: 'm.media-amazon.com',
    })).diff({
      store: 'amazon-us',
      a: AMAZON_URL,
      b: AMAZON_URL,
    });
    expect(failing).toMatchObject({ ok: false, error: 'http' });
  });
});

describe('cache status from resource timing (AC-F0.3)', () => {
  it('reads a transfer size as a download and a body without transfer as a cache hit', () => {
    expect(
      cacheStatusFromTiming({
        transferSize: 4000,
        encodedBodySize: 3700,
        decodedBodySize: 3700,
        responseStart: 1,
      }),
    ).toBe(false);
    expect(
      cacheStatusFromTiming({
        transferSize: 0,
        encodedBodySize: 3700,
        decodedBodySize: 3700,
        responseStart: 1,
      }),
    ).toBe(true);
  });
  it('says unknown when the browser hides the sizes', () => {
    expect(
      cacheStatusFromTiming({ transferSize: 0, encodedBodySize: 0, decodedBodySize: 0, responseStart: 0 }),
    ).toBeNull();
    expect(cacheStatusFromTiming(undefined)).toBeNull();
  });
});

describe('Chrome offscreen lifecycle (ADR)', () => {
  function fakeTimers() {
    const pending = new Map<number, () => void>();
    let next = 1;
    const timers: Timers = {
      set: (fn) => {
        pending.set(next, fn);
        return next++;
      },
      clear: (h) => void pending.delete(h as number),
    };
    return {
      timers,
      fire: () => [...pending.values()].forEach((f) => f()),
      count: () => pending.size,
      pending,
    };
  }

  function fakeApi() {
    let open = false;
    const api: OffscreenApi & { created: number; closed: number } = {
      created: 0,
      closed: 0,
      hasDocument: async () => open,
      createDocument: async () => {
        await new Promise((r) => setTimeout(r, 5));
        open = true;
        api.created++;
      },
      closeDocument: async () => {
        open = false;
        api.closed++;
      },
    };
    return api;
  }

  const transport = () => ({
    hash: vi.fn(async () => []),
    diff: vi.fn(async () => ({ ok: false as const, error: 'http' as const, records: [] })),
  });

  it('creates the document once even for concurrent requests', async () => {
    const api = fakeApi();
    const t = transport();
    const h = createOffscreenHasher(api, t, { timers: fakeTimers().timers });
    await Promise.all([
      h.hash({ store: 'amazon-us', urls: [] }),
      h.hash({ store: 'amazon-us', urls: [] }),
      h.diff({ store: 'amazon-us', a: 'a', b: 'b' }),
    ]);
    expect(api.created).toBe(1);
    expect(t.hash).toHaveBeenCalledTimes(2);
    expect(t.diff).toHaveBeenCalledTimes(1);
  });

  it('closes after 60 seconds without work and recreates on demand', async () => {
    const api = fakeApi();
    const ft = fakeTimers();
    const h = createOffscreenHasher(api, transport(), { timers: ft.timers });
    expect(OFFSCREEN_IDLE_MS).toBe(60_000);
    await h.hash({ store: 'amazon-us', urls: [] });
    expect(ft.count()).toBe(1);
    ft.fire();
    await new Promise((r) => setTimeout(r, 0));
    expect(api.closed).toBe(1);
    await h.hash({ store: 'amazon-us', urls: [] });
    expect(api.created).toBe(2);
  });

  it('does not close while work is in flight and restarts the idle timer after it', async () => {
    const api = fakeApi();
    const ft = fakeTimers();
    let release: () => void = () => undefined;
    const t = transport();
    t.hash.mockImplementation(
      () =>
        new Promise((r) => {
          release = () => r([] as never);
        }),
    );
    const h = createOffscreenHasher(api, t, { timers: ft.timers });
    const pending = h.hash({ store: 'amazon-us', urls: [] });
    await new Promise((r) => setTimeout(r, 10));
    expect(ft.count()).toBe(0);
    await h.closeIfIdle();
    expect(api.closed).toBe(0);
    release();
    await pending;
    expect(ft.count()).toBe(1);
  });

  it('propagates a transport failure and still schedules the idle close', async () => {
    const api = fakeApi();
    const ft = fakeTimers();
    const t = transport();
    t.hash.mockRejectedValueOnce(new Error('port closed'));
    const h = createOffscreenHasher(api, t, { timers: ft.timers });
    await expect(h.hash({ store: 'amazon-us', urls: [] })).rejects.toThrow('port closed');
    expect(ft.count()).toBe(1);
  });
});
