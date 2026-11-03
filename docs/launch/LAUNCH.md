# Launch kit: Factory Twins 0.1.0

Everything here is ready to paste. Every claim traces to the code, a test or a measurement in this
repository; nothing below may be strengthened without new evidence. Before posting, the repository must
be public at `https://github.com/NINJA981/factory-twins` (the extension's "Report layout" link and the
README badges point there).

## Files in this folder

| File | Size | Use |
|---|---|---|
| `store-1-fold.png` | 1280 × 800 | Hero for the post, README and store listing: the five-listing group folded into one card |
| `store-2-rings.png` | 1280 × 800 | Store screenshot: rings and letter badges on the demo results page |
| `store-3-lens.png` | 1280 × 800 | Store screenshot: Proof lens in Difference view |
| `social-preview.png` | 1280 × 640 | GitHub social preview (Settings → Social preview) and link card |
| `fold-card.png` | element size | The fold card alone, for a carousel slide |
| `factory-twins-0.1.0-chrome.zip` | | Chrome build: attach to the GitHub release; upload to the Chrome Web Store |
| `factory-twins-0.1.0-firefox.zip` | | Firefox build: attach to the release; upload to addons.mozilla.org |
| (not committed) `factory-twins-0.1.0-sources.zip` | about 14 MB | Source package that addons.mozilla.org asks for with a bundled build: `pnpm zip:firefox` writes it to `.output/` |

All screenshots are the real built extension (`FT_LAUNCH=1 pnpm test:e2e launch`) on the made-up demo
store in `tests/fixtures/demo`. Every brand, price, rating and photo in them is invented, and no store logo
or store styling appears.

## LinkedIn post

Hook adapted from the original pitch. It describes the demo honestly: the numbers come from the made-up
demo store shown in the image, not from a real Amazon page.

```
A $34.99 laptop stand and an $11.99 one can use the exact same factory photo. I built a browser extension that shows you, then lets you check the pixels yourself.

Search "laptop stand" and page 1 is full of listings that look different but share one product photo under different brand names. I wanted to see that at a glance, without sending my searches anywhere.

Factory Twins, open source:
- Rings every listing on the results page that uses the same photo, in a shared colour and letter.
- Press F and each group folds into one card with a price ladder and a "brand tax": the gap between the cheapest and the priciest copy.
- Press P for the Proof lens: lay one photo over the other, or switch to Difference, where matching pixels turn black and anything that differs lights up.

It runs on your device. No account, no server; the only requests re-read the thumbnails already on the page, from the store's own image server.

Honest limits: v0.1 has only been tested on a made-up demo store, not on live Amazon or Walmart pages yet, and it compares photos, not products. A ring means "worth a look", not "fake".

Source and builds for Chrome and Firefox: https://github.com/NINJA981/factory-twins

#opensource #browserextension #privacy
```

About 1,150 characters. The link can move to the first comment if you prefer (see the playbook's note on
link reach; nothing is measured for this account).

A proof line was left out on purpose: no accuracy or savings figure has been measured on real store pages.
If you want one technical fact, this one is checked by an automated test
(`tests/e2e/acceptance.spec.ts`): "On the 60-listing demo page it reads each of the 60 thumbnails exactly
once and finds all six twin groups."

### Image and alt text

Attach `store-1-fold.png` (or a carousel of `store-1-fold.png`, `store-2-rings.png`, `store-3-lens.png`).

- `store-1-fold.png`: "A made-up store results page for laptop stands. Factory Twins has folded five
  listings that share one photo into a single card: a price ladder from $11.99 to $34.99, ratings and
  review counts under each price, and a tag reading Brand tax +$23.00. A pill in the corner reads 60
  listings, 47 products, 6 twin groups, up to $23 brand tax."
- `store-2-rings.png`: "The same made-up results page with coloured rings and letter badges around every
  listing that shares a photo with another listing."
- `store-3-lens.png`: "The Proof lens dialog comparing the cheapest and the priciest listing's photos in
  Difference view, where matching pixels turn black, with the share of matching pixels as a large number."
- `social-preview.png`: "Factory Twins: a real fold card from the extension with the line: Same factory
  photo, five brand names. See the price ladder, check the pixels."

## GitHub repository settings

- **Description (under 120 characters):** "Browser extension that rings listings sharing the same factory
  photo and folds them into a price ladder. On-device."
- **Topics:** `browser-extension`, `chrome-extension`, `firefox-addon`, `perceptual-hash`, `privacy`,
  `shopping`, `wxt`, `typescript`
- **Social preview:** upload `docs/launch/social-preview.png`.
- **Security:** turn on private vulnerability reporting (SECURITY.md and CODE_OF_CONDUCT.md point to it).
- **Release `v0.1.0`:** attach the Chrome and Firefox zips above (and the sources zip for addons.mozilla.org); paste the 0.1.0 section of `CHANGELOG.md`.

## Store listing copy (Chrome Web Store and addons.mozilla.org)

Not submitted. Submit only after the extension has been checked on live search pages (README,
Limitations).

**Name:** Factory Twins

**Summary (132 characters max):** See which search results use the same factory photo, fold them into one
price ladder, and check the pixels yourself.

**Description:**

> On an Amazon.com or Walmart.com search page, Factory Twins rings every listing that uses the same
> product photo, then folds each group into one card with a price ladder, so you can see how many
> distinct photos the page really holds and what the priciest copy charges over the cheapest.
>
> - A small pill in the corner sums up the page: listings, distinct photos, twin groups and the largest
>   price gap.
> - Press T to ring the groups, F to fold them into price ladders, P to open the Proof lens and compare
>   two photos pixel by pixel.
> - Ratings and review counts sit under every price, and a listing with very few reviews that borrows a
>   well-reviewed listing's photo is pointed out.
>
> It compares photos, not products: a group can mix an original with a listing that borrowed its picture.
> Factory Twins shows the evidence and leaves the verdict to you.
>
> Private by design: no account, no server, no analytics. The only network requests re-read the
> thumbnails already on the page from the store's own image server, without cookies. Settings stay in
> your browser; search memory is cleared when the browser closes.
>
> Not affiliated with Amazon or Walmart.

**Single purpose (Chrome):** Show which listings on a store search page share the same product photo and
compare their prices.

**Permission justifications (Chrome):**

- Host permissions for `m.media-amazon.com`, `images-na.ssl-images-amazon.com`, `i5.walmartimages.com`:
  re-read the product thumbnails already shown on the search page to compute perceptual hashes. No other
  host is contacted.
- `storage`: keep the user's settings and, for the browser session only, photo hashes and per-search
  groups.
- `offscreen`: decode and hash thumbnails off the page's main thread.
- Content scripts on `amazon.com/s*` and `walmart.com/search*`: read the result tiles and draw the
  overlay.

**Data disclosure:** collects no user data. Privacy policy text: the README's "Privacy" section (host it
at a public URL before submission; the Chrome dashboard needs a URL).

**Screenshots:** `store-1-fold.png`, `store-2-rings.png`, `store-3-lens.png` (1280 × 800, square corners).
