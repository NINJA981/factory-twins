import { defineExtensionMessaging } from '@webext-core/messaging';
import type { BackgroundProtocol, OffscreenProtocol, TabProtocol } from './protocol';

// One messenger per direction. Each extension context only registers listeners for its own
// protocol; a message type nobody in a context listens for is ignored there.

export const backgroundMessenger = defineExtensionMessaging<BackgroundProtocol>();
export const offscreenMessenger = defineExtensionMessaging<OffscreenProtocol>();
export const tabMessenger = defineExtensionMessaging<TabProtocol>();
