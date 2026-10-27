import { globalTimers, type Timers } from '../core/async';
import type { DiffOutcome, DiffRequest, HashOutcome, HashRequest, Hasher } from './types';

// Service-worker side of the Chrome hasher (ADR, offscreen lifecycle): create the offscreen
// document once (single in-flight promise), forward work to it, close it after 60 s idle.

export const OFFSCREEN_PATH = 'offscreen.html';
export const OFFSCREEN_JUSTIFICATION =
  'Decode product thumbnails into pixels to compute perceptual hashes locally.';
export const OFFSCREEN_IDLE_MS = 60_000;

/** The slice of chrome.offscreen / chrome.runtime this needs, injectable for tests. */
export interface OffscreenApi {
  hasDocument(): Promise<boolean>;
  createDocument(): Promise<void>;
  closeDocument(): Promise<void>;
}

export interface OffscreenTransport {
  hash(req: HashRequest): Promise<HashOutcome[]>;
  diff(req: DiffRequest): Promise<DiffOutcome>;
}

export interface OffscreenHasher extends Hasher {
  /** For tests and shutdown: closes the document now if idle. */
  closeIfIdle(): Promise<void>;
}

export function createOffscreenHasher(
  api: OffscreenApi,
  transport: OffscreenTransport,
  opts: { idleMs?: number; timers?: Timers } = {},
): OffscreenHasher {
  const idleMs = opts.idleMs ?? OFFSCREEN_IDLE_MS;
  const timers = opts.timers ?? globalTimers;
  let creating: Promise<void> | null = null;
  let busy = 0;
  let idleTimer: unknown = null;

  async function ensure(): Promise<void> {
    if (await api.hasDocument()) return;
    creating ??= api.createDocument().finally(() => {
      creating = null;
    });
    await creating;
  }

  async function closeIfIdle(): Promise<void> {
    if (busy > 0) return;
    if (await api.hasDocument()) await api.closeDocument();
  }

  function scheduleClose(): void {
    if (idleTimer != null) timers.clear(idleTimer);
    idleTimer = timers.set(() => {
      idleTimer = null;
      void closeIfIdle().catch(() => undefined);
    }, idleMs);
  }

  async function run<T>(work: () => Promise<T>): Promise<T> {
    busy++;
    if (idleTimer != null) {
      timers.clear(idleTimer);
      idleTimer = null;
    }
    try {
      await ensure();
      return await work();
    } finally {
      busy--;
      if (busy === 0) scheduleClose();
    }
  }

  return {
    hash: (req) => run(() => transport.hash(req)),
    diff: (req) => run(() => transport.diff(req)),
    closeIfIdle,
  };
}
