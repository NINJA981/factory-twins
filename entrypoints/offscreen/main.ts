import { offscreenMessenger } from '../../src/messaging/messengers';
import { createInPlaceHasher } from '../../src/hasher/browserHasher';

// Chrome-only hasher context (ADR decision 3). It only has the runtime API: no storage. Results go
// back to the background, which owns the hash cache and the network counter.
const hasher = createInPlaceHasher();
offscreenMessenger.onMessage('offscreen:hash', ({ data }) => hasher.hash(data));
offscreenMessenger.onMessage('offscreen:diff', ({ data }) => hasher.diff(data));
