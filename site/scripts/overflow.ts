// Dev helper: lists elements that stick out past the viewport at a given width.
import { chromium } from '@playwright/test';
const [path = '/', w = '375'] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Number(w), height: 812 }, isMobile: Number(w) < 768, hasTouch: Number(w) < 768 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:4182${path}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const res = await p.evaluate((vw) => {
  const out: string[] = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
      out.push(`${el.tagName.toLowerCase()}.${(el.className?.toString?.() ?? '').split(' ').join('.')} L${Math.round(r.left)} R${Math.round(r.right)}`);
    }
  }
  return { sw: document.documentElement.scrollWidth, out: out.slice(0, 25) };
}, Number(w));
console.log(JSON.stringify(res, null, 1));
await b.close();
