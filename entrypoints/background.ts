import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { createCoordinator } from '../src/background/coordinator';
import { createBrowserHasher } from '../src/hasher/browserHasher';
import { backgroundMessenger, tabMessenger } from '../src/messaging/messengers';
import { wxtArea } from '../src/storage/wxtArea';

// Chrome service worker / Firefox event page: the coordinator (ADR decision 4). Listeners are
// registered synchronously inside main so a cold worker wakes up ready for the first message.
export default defineBackground(() => {
  const coordinator = createCoordinator({
    session: wxtArea('session'),
    local: wxtArea('local'),
    hasher: createBrowserHasher(),
  });

  backgroundMessenger.onMessage('hashImages', ({ data }) => coordinator.hashImages(data));
  backgroundMessenger.onMessage('pixelDiff', ({ data }) => coordinator.pixelDiff(data));
  backgroundMessenger.onMessage('mergeQuerySession', ({ data }) => coordinator.mergeQuerySession(data));
  backgroundMessenger.onMessage('commitLetters', ({ data }) => coordinator.commitLetters(data));
  backgroundMessenger.onMessage('getSettings', () => coordinator.getSettings());
  backgroundMessenger.onMessage('setSettings', async ({ data }) => {
    const next = await coordinator.setSettings(data);
    // Settings apply to open tabs without a reload (AC-F10.2).
    const tabs = await browser.tabs.query({});
    await Promise.all(
      tabs.flatMap((t) =>
        t.id == null
          ? []
          : [tabMessenger.sendMessage('tab:settings-changed', next, t.id).catch(() => undefined)],
      ),
    );
    return next;
  });
  backgroundMessenger.onMessage('getNetworkCounter', () => coordinator.getNetworkCounter());
  backgroundMessenger.onMessage('clearSessions', async () => {
    const r = await coordinator.clearSessions();
    const tabs = await browser.tabs.query({});
    await Promise.all(
      tabs.flatMap((t) =>
        t.id == null
          ? []
          : [tabMessenger.sendMessage('tab:session-cleared', undefined, t.id).catch(() => undefined)],
      ),
    );
    return r;
  });
  backgroundMessenger.onMessage('undoClearSessions', ({ data }) => coordinator.undoClearSessions(data));
  backgroundMessenger.onMessage('reportTabSummary', async ({ data, sender }) => {
    if (sender.tab?.id != null) await coordinator.reportTabSummary(sender.tab.id, data);
  });
  backgroundMessenger.onMessage('getTabSummary', ({ data }) => coordinator.getTabSummary(data.tabId));

  browser.tabs.onRemoved.addListener((tabId) => {
    void coordinator.forgetTab(tabId);
  });
  // A navigation invalidates the tab's summary; the next content script reports a fresh one.
  browser.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'loading') void coordinator.forgetTab(tabId);
  });

  // Manifest commands (AC-F12.2) go to the active tab's content script.
  browser.commands.onCommand.addListener(async (command) => {
    const action =
      command === 'ring-twins' ? 'toggle-rings' : command === 'fold-twins' ? 'toggle-fold' : null;
    if (!action) return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null)
      await tabMessenger.sendMessage('tab:command', { action }, tab.id).catch(() => undefined);
  });
});
