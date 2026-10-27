import { useCallback, useEffect, useState } from 'react';
import type { PopupApi } from './api';
import type { SettingsPatch } from '../core/settings';
import type { NetworkCounter, Settings } from '../core/types';

export interface Loaded<T> {
  value: T | null;
  failed: boolean;
  /** False until the first load settles, so the UI never flashes an empty state. */
  settled: boolean;
}

/** Loads one async value on mount. Failure is a value, not an exception, so the UI can say so. */
export function useLoaded<T>(load: () => Promise<T>): Loaded<T> & { reload(): void } {
  const [state, setState] = useState<Loaded<T>>({ value: null, failed: false, settled: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load().then(
      (value) => live && setState({ value, failed: false, settled: true }),
      () => live && setState({ value: null, failed: true, settled: true }),
    );
    return () => {
      live = false;
    };
    // `load` is a stable module-level function in both surfaces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function useSettings(api: PopupApi) {
  const { value, failed } = useLoaded(() => api.getSettings());
  const [override, setOverride] = useState<Settings | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const settings = override ?? value;
  const update = useCallback(
    async (patch: SettingsPatch) => {
      setSaveFailed(false);
      try {
        setOverride(await api.setSettings(patch));
      } catch {
        setSaveFailed(true);
      }
    },
    [api],
  );
  return { settings, failed, saveFailed, update };
}

export function useCounter(api: PopupApi): NetworkCounter | null {
  return useLoaded(() => api.getNetworkCounter()).value;
}
