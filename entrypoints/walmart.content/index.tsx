import { defineContentScript } from 'wxt/utils/define-content-script';
import { runContentScript } from '../../src/content/run';

export default defineContentScript({
  matches: ['https://www.walmart.com/search*'],
  runAt: 'document_idle',
  main: (ctx) => runContentScript('walmart-us', ctx),
});
