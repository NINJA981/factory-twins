import type { StoreId, Strictness } from '../core/types';
import { STORE_IDS } from '../core/types';
import { LOAD_FAILED, SAVE_FAILED, SETTINGS_TITLE, SETTING_LABELS, STORE_NAMES } from '../copy/strings';
import { extensionApi, type PopupApi } from './api';
import { useSettings } from './hooks';
import { Switch } from './Switch';

// Options page placeholder (SPEC F10). Every setting is wired; the visual pass restyles it.

const BEHAVIOUR = ['autoPill', 'autoRings', 'sessionMemory', 'singleKeys'] as const;
const STRICTNESS: readonly Strictness[] = ['standard', 'strict'];

export function Options({ api = extensionApi }: { api?: PopupApi }) {
  const { settings, failed, saveFailed, update } = useSettings(api);
  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-8 p-8">
      <h1 className="text-headline font-display text-text">{SETTINGS_TITLE}</h1>
      {(failed || saveFailed) && (
        <p role="alert" className="text-ui text-danger">
          {failed ? LOAD_FAILED : SAVE_FAILED}
        </p>
      )}
      {settings && (
        <>
          <section aria-labelledby="stores" className="flex flex-col gap-3">
            <h2 id="stores" className="text-label-compact text-text-muted">
              Stores
            </h2>
            {STORE_IDS.map((id: StoreId) => (
              <Switch
                key={id}
                checked={settings.stores[id]}
                label={STORE_NAMES[id]}
                onChange={(on) => void update({ stores: { [id]: on } })}
              />
            ))}
          </section>
          <section aria-labelledby="behaviour" className="flex flex-col gap-3">
            <h2 id="behaviour" className="text-label-compact text-text-muted">
              Behaviour
            </h2>
            {BEHAVIOUR.map((key) => (
              <Switch
                key={key}
                checked={settings[key]}
                label={SETTING_LABELS[key]}
                onChange={(on) => void update({ [key]: on })}
              />
            ))}
          </section>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-label-compact text-text-muted">{SETTING_LABELS.strictness}</legend>
            {STRICTNESS.map((value) => (
              <label key={value} className="flex items-center gap-3 text-ui text-text">
                <input
                  type="radio"
                  name="strictness"
                  checked={settings.strictness === value}
                  onChange={() => void update({ strictness: value })}
                />
                {SETTING_LABELS[value]}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </main>
  );
}
