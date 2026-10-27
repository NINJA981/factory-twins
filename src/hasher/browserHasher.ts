import { browser } from 'wxt/browser';
import { offscreenMessenger } from '../messaging/messengers';
import { E2E_BUILD } from '../util/env';
import {
  createOffscreenHasher,
  OFFSCREEN_JUSTIFICATION,
  OFFSCREEN_PATH,
  type OffscreenApi,
} from './chromeOffscreen';
import { decodeWithCanvas, performanceCacheStatus } from './decode';
import { readImage } from './fetchPixels';
import { createHashService } from './service';
import type { Hasher } from './types';

// Picks the hasher context for this browser (ADR decision 3). The only module that knows about
// chrome.offscreen; everything it returns is the plain Hasher interface.

function chromeOffscreenApi(): OffscreenApi {
  const url = browser.runtime.getURL(`/${OFFSCREEN_PATH}`);
  return {
    async hasDocument() {
      const contexts = await browser.runtime.getContexts({
        contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
        documentUrls: [url],
      });
      return contexts.length > 0;
    },
    async createDocument() {
      await browser.offscreen.createDocument({
        url,
        reasons: [browser.offscreen.Reason.BLOBS],
        justification: OFFSCREEN_JUSTIFICATION,
      });
    },
    async closeDocument() {
      await browser.offscreen.closeDocument();
    },
  };
}

/** Hashing in this very context (Firefox background page, or the offscreen document itself). */
export function createInPlaceHasher(): Hasher {
  return createHashService((url, store) =>
    readImage(url, store, {
      fetch: (input, init) => fetch(input, init),
      decode: decodeWithCanvas,
      cacheStatus: performanceCacheStatus,
      e2e: E2E_BUILD,
    }),
  );
}

export function hasOffscreenApi(): boolean {
  return typeof browser.offscreen?.createDocument === 'function';
}

export function createBrowserHasher(): Hasher {
  if (!hasOffscreenApi()) return createInPlaceHasher();
  return createOffscreenHasher(chromeOffscreenApi(), {
    hash: (req) => offscreenMessenger.sendMessage('offscreen:hash', req),
    diff: (req) => offscreenMessenger.sendMessage('offscreen:diff', req),
  });
}
