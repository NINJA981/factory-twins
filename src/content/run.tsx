import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { browser } from 'wxt/browser';
import { ADAPTERS } from '../adapters/registry';
import type { PageScan } from '../core/session/merge';
import type { StoreId } from '../core/types';
import { backgroundMessenger, tabMessenger } from '../messaging/messengers';
import { installFonts } from '../overlay/fonts';
import { mountOverlay } from '../overlay/mount';
import { createController, type ControllerClient } from './controller';

// Shared body of both store content scripts: wire the controller to the background over typed
// messages, mount the overlay, listen for keys and tab messages. Everything is torn down when the
// extension context is invalidated (update, reload).

/** Prefilled issue link for the "Report layout" action. Carries the store and adapter version only. */
export function layoutReportUrl(store: StoreId, adapterVersion: number): string {
  const params = new URLSearchParams({
    title: `Layout changed on ${store}`,
    body: `Store: ${store}\nAdapter version: ${adapterVersion}\nPage type: search results\n\n(No page content is included in this link.)`,
  });
  return `https://github.com/factory-twins/factory-twins/issues/new?${params.toString()}`;
}

const client: ControllerClient = {
  hashImages: (req) => backgroundMessenger.sendMessage('hashImages', req),
  mergeQuerySession: (scan: PageScan) => backgroundMessenger.sendMessage('mergeQuerySession', scan),
  commitLetters: (data) => backgroundMessenger.sendMessage('commitLetters', data),
  getSettings: () => backgroundMessenger.sendMessage('getSettings', undefined),
  reportSummary: (summary) => backgroundMessenger.sendMessage('reportTabSummary', summary),
};

export async function runContentScript(store: StoreId, ctx: ContentScriptContext): Promise<void> {
  const adapter = ADAPTERS[store];
  const controller = createController({ adapter, doc: document, href: location.href, client });
  const removeFonts = installFonts(document, (path) =>
    browser.runtime.getURL(path as '/fonts/rethink-sans-latin-wght.woff2'),
  );
  const overlay = mountOverlay(document, controller, layoutReportUrl(store, adapter.version));

  const onKeydown = (e: KeyboardEvent) => {
    if (controller.handleKeydown(e)) e.stopPropagation();
  };
  document.addEventListener('keydown', onKeydown, true);

  const offCommand = tabMessenger.onMessage('tab:command', ({ data }) => {
    controller.runAction(data.action);
  });
  const offSettings = tabMessenger.onMessage('tab:settings-changed', ({ data }) => {
    controller.applySettings(data);
  });
  const offCleared = tabMessenger.onMessage('tab:session-cleared', () => {
    void controller.rescan();
  });

  ctx.onInvalidated(() => {
    document.removeEventListener('keydown', onKeydown, true);
    offCommand();
    offSettings();
    offCleared();
    controller.stop();
    overlay.unmount();
    removeFonts();
  });

  await controller.start();
}
