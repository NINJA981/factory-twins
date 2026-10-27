import { browser } from 'wxt/browser';
import type { SettingsPatch } from '../core/settings';
import type { NetworkCounter, Settings } from '../core/types';
import { backgroundMessenger } from '../messaging/messengers';
import type { TabSummary } from '../messaging/protocol';

// The popup's and options page's only door to the background. Kept as plain async functions so the
// React tree stays free of extension globals and components can be tested with test doubles.

export interface PopupApi {
  getSettings(): Promise<Settings>;
  setSettings(patch: SettingsPatch): Promise<Settings>;
  getNetworkCounter(): Promise<NetworkCounter>;
  getActiveTabSummary(): Promise<TabSummary | null>;
  clearSessions(): Promise<{ undoToken: string }>;
  undoClearSessions(undoToken: string): Promise<boolean>;
}

export const extensionApi: PopupApi = {
  getSettings: () => backgroundMessenger.sendMessage('getSettings', undefined),
  setSettings: (patch) => backgroundMessenger.sendMessage('setSettings', patch),
  getNetworkCounter: () => backgroundMessenger.sendMessage('getNetworkCounter', undefined),
  async getActiveTabSummary() {
    // No `tabs` permission, so the tab URL is hidden. A summary exists only while a content script
    // on a supported search page has reported one for this tab (the background clears it on navigation).
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) return null;
    return backgroundMessenger.sendMessage('getTabSummary', { tabId: tab.id });
  },
  clearSessions: () => backgroundMessenger.sendMessage('clearSessions', undefined),
  undoClearSessions: (undoToken) => backgroundMessenger.sendMessage('undoClearSessions', { undoToken }),
};
