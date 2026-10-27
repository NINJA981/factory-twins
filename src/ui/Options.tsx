import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type SettingsPatch } from '../core/settings';
import type { StoreId, Strictness } from '../core/types';
import { STORE_IDS } from '../core/types';
import {
  ABOUT_LICENCE,
  ABOUT_LINE,
  ABOUT_SOURCE,
  BEHAVIOUR_HELP,
  CHANGE_SHORTCUTS,
  CLEAR_SESSION,
  LOAD_FAILED_DEFAULTS,
  MATCHING_HELP,
  RELOAD,
  SAVED,
  SAVE_FAILED,
  SECTION,
  SESSION_CLEARED,
  SETTINGS_TITLE,
  SETTING_LABELS,
  SHORTCUTS_HELP,
  SHORTCUT_ROWS,
  STORES_HELP,
  STORE_NAMES,
  UNDO,
} from '../copy/strings';
import { REPO_URL } from '../copy/links';
import { extensionApi, type PopupApi } from './api';
import { useCounter, useFlash, useSettings } from './hooks';
import {
  Button,
  InlineError,
  Keycap,
  MotionRoot,
  PrivacyPanel,
  Segmented,
  Switch,
  Toast,
  TwinGlyph,
} from './kit';

// The options page (SPEC F10): one column, 720 px. Changes save as they are made; the section that
// changed says "Saved" for a moment, or says why it could not.

const BEHAVIOUR = ['autoPill', 'autoRings', 'sessionMemory', 'singleKeys'] as const;
const STRICTNESS: ReadonlyArray<{ value: Strictness; label: string }> = [
  { value: 'standard', label: SETTING_LABELS.standard },
  { value: 'strict', label: SETTING_LABELS.strict },
];

function Section({
  id,
  title,
  help,
  saved,
  failed,
  children,
}: {
  id: string;
  title: string;
  help?: string;
  saved?: boolean;
  failed?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 border-t border-border pt-4 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-lead font-semibold text-text">
          {title}
        </h2>
        <span
          className={`text-caption transition-opacity duration-150 motion-reduce:transition-none ${
            failed ? 'text-danger opacity-100' : 'text-success'
          } ${saved || failed ? 'opacity-100' : 'opacity-0'}`}
          role="status"
        >
          {failed ? SAVE_FAILED : saved ? SAVED : ''}
        </span>
      </div>
      {help && <p className="max-w-[56ch] text-ui text-text-muted [text-wrap:pretty]">{help}</p>}
      {children}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-md bg-surface px-4 py-1 shadow-e1">
      {children}
    </div>
  );
}

export function Options({ api = extensionApi }: { api?: PopupApi }) {
  const { settings: loaded, failed, saveFailed, update } = useSettings(api);
  const settings = loaded ?? DEFAULT_SETTINGS;
  const counter = useCounter(api);
  const [section, setSection] = useState<string | null>(null);
  const [saved, flash] = useFlash(1500);
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const save = async (id: string, patch: SettingsPatch) => {
    setSection(id);
    if (await update(patch)) flash();
  };
  const stateFor = (id: string) => ({ saved: saved && section === id, failed: saveFailed && section === id });

  return (
    <MotionRoot>
      <main
        aria-busy={loaded == null && !failed}
        className="mx-auto flex w-full max-w-[720px] flex-col gap-12 px-4 py-8 sm:px-8 sm:py-12"
      >
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-3 font-display text-headline text-text [text-wrap:balance]">
            <span className="text-accent">
              <TwinGlyph size={32} />
            </span>
            {SETTINGS_TITLE}
          </h1>
          {failed && (
            <div className="flex flex-wrap items-center gap-3">
              <InlineError>{LOAD_FAILED_DEFAULTS}</InlineError>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                {RELOAD}
              </Button>
            </div>
          )}
        </header>

        <Section id="stores" title={SECTION.stores} help={STORES_HELP} {...stateFor('stores')}>
          <Card>
            {STORE_IDS.map((id: StoreId) => (
              <Switch
                key={id}
                checked={settings.stores[id]}
                label={STORE_NAMES[id]}
                density="comfortable"
                onChange={(on) => void save('stores', { stores: { [id]: on } })}
              />
            ))}
          </Card>
        </Section>

        <Section id="behaviour" title={SECTION.behaviour} {...stateFor('behaviour')}>
          <Card>
            {BEHAVIOUR.map((key) => (
              <Switch
                key={key}
                checked={settings[key]}
                label={SETTING_LABELS[key]}
                hint={BEHAVIOUR_HELP[key]}
                density="comfortable"
                onChange={(on) => void save('behaviour', { [key]: on })}
              />
            ))}
          </Card>
        </Section>

        <Section id="matching" title={SECTION.matching} {...stateFor('matching')}>
          <Segmented
            label={SETTING_LABELS.strictness}
            value={settings.strictness}
            options={STRICTNESS}
            onChange={(v) => void save('matching', { strictness: v })}
          />
          <p className="max-w-[56ch] text-ui text-text-muted [text-wrap:pretty]">
            {MATCHING_HELP[settings.strictness]}
          </p>
        </Section>

        <Section id="shortcuts" title={SECTION.shortcuts} help={SHORTCUTS_HELP}>
          <Card>
            <ul className="m-0 flex list-none flex-col p-0">
              {SHORTCUT_ROWS.map((row) => (
                <li
                  key={row.label}
                  className="flex min-h-11 items-center gap-4 border-b border-border py-2 text-ui text-text last:border-b-0"
                >
                  <span className="flex w-20 shrink-0 gap-1">
                    {row.keys.map((k) => (
                      <Keycap key={k}>{k}</Keycap>
                    ))}
                  </span>
                  {row.label}
                </li>
              ))}
            </ul>
          </Card>
          <div>
            <Button variant="secondary" onClick={() => void api.openShortcutsPage()} className="group">
              {CHANGE_SHORTCUTS}
              <ArrowUpRight
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="transition-transform duration-150 group-hover:translate-x-px group-hover:-translate-y-px motion-reduce:transition-none"
              />
            </Button>
          </div>
        </Section>

        <Section id="privacy" title={SECTION.privacy}>
          <PrivacyPanel counter={counter} />
          <div>
            <Button
              variant="secondary"
              onClick={async () => {
                const { undoToken: token } = await api.clearSessions();
                setUndoToken(token);
                if (toastTimer.current) clearTimeout(toastTimer.current);
                toastTimer.current = setTimeout(() => setUndoToken(null), 6000);
              }}
            >
              {CLEAR_SESSION}
            </Button>
          </div>
        </Section>

        <Section id="about" title={SECTION.about}>
          <p className="max-w-[56ch] text-ui text-text-muted [text-wrap:pretty]">{ABOUT_LINE}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ui-compact text-text-muted">
            <span className="tabular-nums">Version {api.getVersion()}</span>
            <span>{ABOUT_LICENCE}</span>
            <a
              className="rounded-xs text-accent underline underline-offset-3"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              {ABOUT_SOURCE}
            </a>
          </p>
        </Section>

        <Toast
          show={undoToken != null}
          message={SESSION_CLEARED}
          action={{
            label: UNDO,
            onClick: async () => {
              if (undoToken) await api.undoClearSessions(undoToken);
              setUndoToken(null);
            },
          }}
        />
      </main>
    </MotionRoot>
  );
}
