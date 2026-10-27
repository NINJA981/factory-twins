// Dev helper: prints FCP and every LCP candidate on a throttled mobile profile (4x CPU, Fast 4G-ish).
// Usage: pnpm preview (other shell), then: pnpm tsx scripts/lcp.ts [root|app]
import { chromium } from '@playwright/test';
const arg = process.argv[2] ?? 'root';
const url = `http://127.0.0.1:${process.env.PORT ?? 4182}${arg === 'root' ? '/' : `/${arg}/`}`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  (window as any).__m = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e: any) => (window as any).__m.push([e.entryType, Math.round(e.startTime), e.element?.className || e.element?.tagName || e.name, e.size]))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e: any) => (window as any).__m.push([e.entryType, Math.round(e.startTime), e.name]))).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e: any) => (window as any).__m.push([e.entryType, Math.round(e.startTime), e.name, Math.round(e.duration)]))).observe({ type: 'resource', buffered: true });
});
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const m = (await page.evaluate(() => (window as any).__m)) as unknown[][];
for (const r of m) console.log(r.join('\t'));
await b.close();
