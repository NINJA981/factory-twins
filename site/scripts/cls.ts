// Dev helper: lists layout shifts with their sources on a throttled mobile profile.
// Usage: node scripts/serve-dist.mjs (other shell), then: pnpm tsx scripts/cls.ts [root|app]
import { chromium } from '@playwright/test';
const arg = process.argv[2] ?? 'root';
const url = `http://127.0.0.1:${process.env.PORT ?? 4182}${arg === 'root' ? '/' : `/${arg}/`}`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Number(process.env.W ?? 375), height: 812 }, deviceScaleFactor: 2, isMobile: Number(process.env.W ?? 375) < 768, hasTouch: Number(process.env.W ?? 375) < 768 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  (window as any).__cls = [];
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e: any) =>
      (window as any).__cls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: e.sources.map((s: any) => `${s.node?.className || s.node?.nodeName} ${JSON.stringify(s.previousRect)} -> ${JSON.stringify(s.currentRect)}`) }),
    ),
  ).observe({ type: 'layout-shift', buffered: true });
});
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(3500);
console.log(JSON.stringify(await page.evaluate(() => (window as any).__cls), null, 1));
await b.close();
