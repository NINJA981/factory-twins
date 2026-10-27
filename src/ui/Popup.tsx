import { useState } from 'react';
import type { NetworkCounter, StoreId } from '../core/types';
import { STORE_IDS } from '../core/types';
import {
  CLEAR_SESSION,
  EXAMPLE_SEARCHES,
  NOBODY_ELSE,
  PRIVACY_CAPTION,
  PRODUCT_NAME,
  PRIVACY_TITLE,
  LOAD_FAILED,
  SAVE_FAILED,
  SEARCH_AMAZON,
  SEARCH_WALMART,
  SESSION_CLEARED,
  UNDO,
  UNSUPPORTED_BODY,
  UNSUPPORTED_TITLE,
  formatCount,
  imageReadsLine,
  offOnStore,
  onForStore,
} from '../copy/strings';
import { extensionApi, type PopupApi } from './api';
import { useCounter, useLoaded, useSettings } from './hooks';
import { Switch } from './Switch';

// Popup placeholder (SPEC F9). Structure and data are real; the visual pass restyles it.

function PrivacyPanel({ counter }: { counter: NetworkCounter | null }) {
  return (
    <section aria-labelledby="privacy" className="rounded-md bg-surface-2 p-4">
      <h2 id="privacy" className="text-title font-display text-text">
        {PRIVACY_TITLE}
      </h2>
      <p className="mt-1 text-ui-compact text-text-muted">{PRIVACY_CAPTION}</p>
      {counter && (
        <p className="mt-2 text-ui-compact text-text" data-testid="reads">
          {imageReadsLine(counter.byHost)} {NOBODY_ELSE}
        </p>
      )}
    </section>
  );
}

function Unsupported() {
  return (
    <section>
      <h2 className="text-title text-text">{UNSUPPORTED_TITLE}</h2>
      <p className="mt-1 text-ui text-text-muted">{UNSUPPORTED_BODY}</p>
      <p className="mt-3 flex gap-4 text-ui">
        <a
          className="text-accent underline"
          href={EXAMPLE_SEARCHES['amazon-us']}
          target="_blank"
          rel="noreferrer noopener"
        >
          {SEARCH_AMAZON}
        </a>
        <a
          className="text-accent underline"
          href={EXAMPLE_SEARCHES['walmart-us']}
          target="_blank"
          rel="noreferrer noopener"
        >
          {SEARCH_WALMART}
        </a>
      </p>
    </section>
  );
}

export function Popup({ api = extensionApi }: { api?: PopupApi }) {
  const { settings, failed, saveFailed, update } = useSettings(api);
  const counter = useCounter(api);
  const tab = useLoaded(() => api.getActiveTabSummary());
  const [undoToken, setUndoToken] = useState<string | null>(null);

  const summary = tab.value;
  return (
    <main className="flex w-[360px] flex-col gap-4 p-4">
      <h1 className="text-title font-display text-text">{PRODUCT_NAME}</h1>
      {summary ? (
        <section aria-label="This page" data-testid="page-counts">
          <p className="text-ui text-text">
            {formatCount(summary.listings)} listings, {formatCount(summary.products)} products,{' '}
            {formatCount(summary.twinGroups)} twin groups
          </p>
        </section>
      ) : (
        tab.settled && <Unsupported />
      )}

      {settings && (
        <section aria-label="Stores" className="flex flex-col gap-2">
          {STORE_IDS.map((id: StoreId) => (
            <Switch
              key={id}
              checked={settings.stores[id]}
              label={settings.stores[id] ? onForStore(id) : offOnStore(id)}
              onChange={(on) => void update({ stores: { [id]: on } })}
            />
          ))}
        </section>
      )}
      {(failed || saveFailed) && (
        <p role="alert" className="text-ui-compact text-danger">
          {failed ? LOAD_FAILED : SAVE_FAILED}
        </p>
      )}

      <PrivacyPanel counter={counter} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-sm bg-surface-3 px-3 py-2 text-ui text-text"
          onClick={async () => setUndoToken((await api.clearSessions()).undoToken)}
        >
          {CLEAR_SESSION}
        </button>
        {undoToken && (
          <span role="status" className="flex items-center gap-2 text-ui-compact text-text-muted">
            {SESSION_CLEARED}
            <button
              type="button"
              className="text-accent underline"
              onClick={async () => {
                await api.undoClearSessions(undoToken);
                setUndoToken(null);
              }}
            >
              {UNDO}
            </button>
          </span>
        )}
      </div>
    </main>
  );
}
