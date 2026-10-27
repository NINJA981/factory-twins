import { THRESHOLDS, type MatchThresholds } from './constants';
import { STORE_IDS, type Settings, type StoreId, type Strictness } from './types';

/** Defaults from SPEC AC-F10.1. */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  stores: Object.freeze({ 'amazon-us': true, 'walmart-us': true }) as Record<StoreId, boolean>,
  autoPill: true,
  autoRings: false,
  sessionMemory: true,
  singleKeys: true,
  strictness: 'standard',
});

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Reads settings from untrusted storage (older versions, hand edits, partial writes). Unknown keys
 * are dropped and every missing or mistyped field falls back to its default, so a bad value can
 * never disable the extension in a way the options page cannot show.
 */
export function normalizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const r = isRecord(raw) ? raw : {};
  const rawStores = isRecord(r.stores) ? r.stores : {};
  const stores = {} as Record<StoreId, boolean>;
  for (const id of STORE_IDS) stores[id] = bool(rawStores[id], d.stores[id]);
  const strictness: Strictness =
    r.strictness === 'strict' || r.strictness === 'standard' ? r.strictness : d.strictness;
  return {
    stores,
    autoPill: bool(r.autoPill, d.autoPill),
    autoRings: bool(r.autoRings, d.autoRings),
    sessionMemory: bool(r.sessionMemory, d.sessionMemory),
    singleKeys: bool(r.singleKeys, d.singleKeys),
    strictness,
  };
}

export type SettingsPatch = Partial<Omit<Settings, 'stores'>> & {
  stores?: Partial<Record<StoreId, boolean>>;
};

export function applySettingsPatch(current: Settings, patch: SettingsPatch): Settings {
  return normalizeSettings({ ...current, ...patch, stores: { ...current.stores, ...patch.stores } });
}

export function thresholdsFor(settings: Pick<Settings, 'strictness'>): MatchThresholds {
  return THRESHOLDS[settings.strictness];
}
