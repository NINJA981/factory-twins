import { motion } from 'motion/react';
import { Keyboard, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StoreId } from '../core/types';
import { STORE_IDS } from '../core/types';
import {
  ACTION_FOLD,
  ACTION_SHOW_TWINS,
  CHECKING_PHOTOS,
  CLEAR_SESSION,
  COMMAND_FAILED,
  EXAMPLE_SEARCHES,
  LOAD_FAILED,
  POPUP_ERROR,
  POPUP_PILL_OFF,
  POPUP_WAIT_SCANNING,
  PRODUCT_NAME,
  REPORT_LAYOUT,
  SAVE_FAILED,
  SEARCH_AMAZON,
  SEARCH_WALMART,
  SESSION_CLEARED,
  SETTINGS_LINK,
  SHORTCUTS_LINK,
  SHORTCUT_ROWS,
  STATUS_NOT_SEARCH,
  STAT_GROUPS,
  STAT_LISTINGS,
  STAT_PRODUCTS,
  STAT_TAX,
  UNDO,
  UNSUPPORTED_BODY,
  UNSUPPORTED_TITLE,
  formatCount,
  formatPrice,
  offOnStore,
  onForStore,
  popupScanning,
} from '../copy/strings';
import { layoutReportUrl } from '../copy/links';
import type { TabSummary } from '../messaging/protocol';
import { extensionApi, type PopupApi } from './api';
import { useCounter, useLoaded, useSettings } from './hooks';
import {
  Button,
  InlineError,
  Keycap,
  MotionRoot,
  PrivacyPanel,
  Switch,
  Toast,
  TwinGlyph,
  useKeyPressed,
} from './kit';

// The toolbar popup (SPEC F9): 360 px, compact, one primary action, the privacy panel always in view.

const PRESSABLE = ['t', 'f'] as const;

function StatusChip({ summary, settled }: { summary: TabSummary | null; settled: boolean }) {
  if (!settled) return <span className="h-6 w-24 rounded-full bg-surface-2" aria-hidden="true" />;
  const dot =
    summary?.status === 'ready'
      ? 'bg-success'
      : summary?.status === 'scanning'
        ? 'bg-text-subtle'
        : summary?.status === 'error'
          ? 'bg-danger'
          : null;
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-caption text-text-muted">
      {dot && <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />}
      {summary
        ? summary.status === 'off'
          ? offOnStore(summary.store)
          : onForStore(summary.store)
        : STATUS_NOT_SEARCH}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-8 items-center justify-between">
      <dt className="text-ui-compact text-text-muted">{label}</dt>
      <dd className="m-0 text-price tabular-nums text-text">{value}</dd>
    </div>
  );
}

function Stats({ summary }: { summary: Extract<TabSummary, { status: 'ready' }> }) {
  return (
    <dl
      aria-label="This page"
      data-testid="page-counts"
      className="m-0 divide-y divide-border rounded-md bg-surface px-3 shadow-e1"
    >
      <StatRow label={STAT_LISTINGS} value={formatCount(summary.listings)} />
      <StatRow label={STAT_PRODUCTS} value={formatCount(summary.products)} />
      <StatRow label={STAT_GROUPS} value={formatCount(summary.twinGroups)} />
      <StatRow
        label={STAT_TAX}
        value={summary.maxBrandTaxDollars != null ? formatPrice(summary.maxBrandTaxDollars) : 'None'}
      />
    </dl>
  );
}

function StatsSkeleton({ progress }: { progress?: { done: number; total: number } }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <div className="divide-y divide-border rounded-md bg-surface px-3 shadow-e1">
        {[STAT_LISTINGS, STAT_PRODUCTS, STAT_GROUPS, STAT_TAX].map((l) => (
          <div key={l} className="flex h-8 items-center justify-between">
            <span className="text-ui-compact text-text-muted">{l}</span>
            <span className="h-4 w-8 animate-pulse rounded-xs bg-surface-3 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <p role="status" className="min-h-5 px-1 text-caption text-text-muted tabular-nums">
        {progress ? popupScanning(progress.done, progress.total) : CHECKING_PHOTOS}
      </p>
    </div>
  );
}

function Unsupported() {
  return (
    <section aria-labelledby="empty-title" className="flex flex-col gap-3 px-1 pt-2">
      <h2 id="empty-title" className="font-display text-title text-text [text-wrap:balance]">
        {UNSUPPORTED_TITLE}
      </h2>
      <p className="text-ui-compact text-text-muted">{UNSUPPORTED_BODY}</p>
      <div className="flex gap-2">
        {(
          [
            ['amazon-us', SEARCH_AMAZON],
            ['walmart-us', SEARCH_WALMART],
          ] as const
        ).map(([id, label]) => (
          <a
            key={id}
            href={EXAMPLE_SEARCHES[id]}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 flex-1 items-center justify-center rounded-sm border border-border bg-surface text-label-compact text-text no-underline shadow-e1 transition-[background-color,transform] duration-100 active:scale-[0.97] [@media(hover:hover)]:hover:bg-surface-2 motion-reduce:transition-none"
          >
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}

function ShortcutList() {
  return (
    <motion.ul
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="m-0 flex list-none flex-col gap-1 rounded-md bg-surface-2 p-3"
    >
      {SHORTCUT_ROWS.slice(0, 4).map((row) => (
        <li key={row.label} className="flex items-center gap-3 text-ui-compact text-text-muted">
          <span className="flex w-12 shrink-0 gap-1">
            {row.keys.map((k) => (
              <Keycap key={k}>{k}</Keycap>
            ))}
          </span>
          {row.label}
        </li>
      ))}
    </motion.ul>
  );
}

export function Popup({ api = extensionApi }: { api?: PopupApi }) {
  const { settings, failed, saveFailed, update } = useSettings(api);
  const counter = useCounter(api);
  const tab = useLoaded(() => api.getActiveTabSummary());
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [commandFailed, setCommandFailed] = useState(false);
  const pressed = useKeyPressed(PRESSABLE);
  const summary = tab.value;
  const status = summary?.status ?? null;
  const ready = summary?.status === 'ready';

  // While the page is still being read, follow its progress.
  const reloadTab = tab.reload;
  useEffect(() => {
    if (status !== 'scanning') return;
    const id = setInterval(reloadTab, 400);
    return () => clearInterval(id);
  }, [status, reloadTab]);

  // Skeleton rows only if the page state takes longer than 150 ms to arrive.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 150);
    return () => clearTimeout(t);
  }, []);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const run = async (action: 'toggle-rings' | 'toggle-fold') => {
    setCommandFailed(false);
    const ok = await api.sendCommand(action);
    if (ok) window.close();
    else setCommandFailed(true);
  };

  // T and F work in the popup too, the same as on the page.
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 't') void run('toggle-rings');
      if (k === 'f') void run('toggle-fold');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const clear = async () => {
    const { undoToken: token } = await api.clearSessions();
    setUndoToken(token);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setUndoToken(null), 6000);
  };

  const storeSwitches: readonly StoreId[] = summary ? [summary.store] : STORE_IDS;

  return (
    <MotionRoot>
      <main className="flex w-[360px] flex-col gap-3 bg-bg p-3 text-ui-compact text-text">
        <header className="flex h-10 items-center justify-between">
          <h1 className="flex items-center gap-2 text-label-compact text-text">
            <span className="text-accent">
              <TwinGlyph />
            </span>
            {PRODUCT_NAME}
          </h1>
          <StatusChip summary={summary} settled={tab.settled} />
        </header>

        {summary?.status === 'ready' || summary?.status === 'scanning' ? (
          <>
            {summary.status === 'ready' ? <Stats summary={summary} /> : <StatsSkeleton progress={summary} />}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                className="w-full justify-between"
                disabled={!ready}
                title={ready ? undefined : POPUP_WAIT_SCANNING}
                onClick={() => void run('toggle-rings')}
              >
                {ACTION_SHOW_TWINS}
                <Keycap pressed={pressed === 't'}>T</Keycap>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-between"
                disabled={!ready}
                title={ready ? undefined : POPUP_WAIT_SCANNING}
                onClick={() => void run('toggle-fold')}
              >
                {ACTION_FOLD}
                <Keycap pressed={pressed === 'f'}>F</Keycap>
              </Button>
              {commandFailed && <InlineError>{COMMAND_FAILED}</InlineError>}
            </div>
          </>
        ) : summary?.status === 'error' ? (
          <section
            aria-label={POPUP_ERROR}
            className="flex flex-col gap-2 rounded-md bg-danger-soft px-3 py-3 shadow-e1"
          >
            <InlineError>{POPUP_ERROR}</InlineError>
            <a
              className="w-fit rounded-xs text-label-compact text-accent underline underline-offset-3"
              href={layoutReportUrl(summary.store, summary.adapterVersion)}
              target="_blank"
              rel="noreferrer noopener"
            >
              {REPORT_LAYOUT}
            </a>
          </section>
        ) : summary?.status === 'off' ? (
          settings?.stores[summary.store] === false ? null : (
            <p className="px-1 text-ui-compact text-text-muted">{POPUP_PILL_OFF}</p>
          )
        ) : tab.settled ? (
          <Unsupported />
        ) : (
          slow && <StatsSkeleton />
        )}

        {settings && (
          <section aria-label="Stores" className="flex flex-col rounded-md bg-surface px-3 py-1 shadow-e1">
            {storeSwitches.map((id) => (
              <Switch
                key={id}
                checked={settings.stores[id]}
                label={settings.stores[id] ? onForStore(id) : offOnStore(id)}
                onChange={(on) => void update({ stores: { [id]: on } })}
              />
            ))}
          </section>
        )}
        {(failed || saveFailed) && <InlineError>{failed ? LOAD_FAILED : SAVE_FAILED}</InlineError>}

        <PrivacyPanel counter={counter} />

        {shortcuts && <ShortcutList />}
        <footer className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShortcuts((s) => !s)} aria-expanded={shortcuts}>
            <Keyboard size={14} strokeWidth={1.75} aria-hidden="true" />
            {SHORTCUTS_LINK}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => void clear()}>
              {CLEAR_SESSION}
            </Button>
            <Button variant="ghost" onClick={() => void api.openOptions()}>
              <SettingsIcon size={14} strokeWidth={1.75} aria-hidden="true" />
              {SETTINGS_LINK}
            </Button>
          </div>
        </footer>
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
