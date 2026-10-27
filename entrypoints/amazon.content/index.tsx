import { defineContentScript } from 'wxt/utils/define-content-script';
import { runContentScript } from '../../src/content/run';

// Matches come from src/adapters/matches.ts so the e2e build can add the local fixture server.
export default defineContentScript({
  matches: ['https://www.amazon.com/s*'],
  runAt: 'document_idle',
  main: (ctx) => runContentScript('amazon-us', ctx),
});
