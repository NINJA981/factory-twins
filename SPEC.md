# Factory Twins: product spec (v0.1)

Status: v0.1, first written 2026-10-20 and kept current with the code. Architecture: `docs/adr/0001-architecture.md`. Visual system: `DESIGN.md`.

> **One line.** On an Amazon or Walmart search page, Factory Twins rings every listing that uses the same factory photo in a shared colour, then folds each twin group into one card with a price ladder and a "Brand tax +$23.00" tag. A Proof lens overlays the photos so anyone can check the match by eye. It runs on your device: no account, no servers.

---

## 1. Problem

White-label catalogues mean page 1 of a common search ("laptop stand", "LED strip", "phone tripod") often holds the same factory photo three to eight times under made-up brand names, at prices that differ by up to 3×. Shoppers compare reviews and prices across what looks like 48 products when there are about 30 distinct ones, and often pay a "brand tax" for a name on a listing whose photo is identical to the $9 one two rows down. The store's search never groups these listings, and nothing on the page shows it.

What is visibly true, and therefore all we claim: **these listings use the same photo.** A same-photo group can mix an original product with a knockoff that stole its hero image. The extension shows evidence (photos, prices, ratings, review counts side by side) and never rules on which listing is "the real one".

## 2. Users

- **Primary:** desktop shoppers who search Amazon.com or Walmart.com for generic goods (household, kitchen, tech accessories, pet, craft), several times a week.
- **Secondary:** people who share "look what I found" screenshots; the rings and the Proof lens are built to be screenshot-legible.
- **Not served:** mobile-app shoppers (an extension cannot run there). This is a desktop-browser tool and the copy says so.

## 3. Daily trigger

Running any search on a supported store. After the result tiles load, a small pill appears in the corner of the page:

> **60 listings → 47 products · 6 twin groups · up to $23 brand tax**

The shopper does nothing to get it. Clicking it (or pressing `T`) rings the twins; `F` folds them; `P` opens the Proof lens. On page 2 and 3 of the same query, groups found earlier are remembered, so a badge can say "seen 9× across 3 pages".

## 4. Weak spots of the idea, and how v0.1 answers them

The idea demos well; its weak spots are everyday utility and novelty. v0.1 answers them as follows.

| Council concern | v0.1 response | Where it is tested |
|---|---|---|
| Utility 6: the value only shows when you click | Passive summary pill on **every** supported search (F4), worded as a concrete saving: "60 listings → 47 products · 6 twin groups · up to $23 brand tax". Shows even with zero clicks. | AC-F4.* |
| Utility 6: one page is a small sample | **Session memory across result pages** (F8): groups persist across page 1, 2, 3 of the same query; badges say "seen 9× across 3 pages"; the pill totals the whole session for that query. | AC-F8.* |
| Utility 6: mobile shopping | Conceded. Desktop-only, stated on the landing page and README. No mobile claims. | Copy review |
| Feasibility 7 / roast: tainted canvas and "0 requests" | **Day 1 proves the hashing path before anything else is built** (F0): offscreen document (Chrome) or background page (Firefox), fetching thumbnails from the store's image CDN under host permission, decoding from a `Blob` so no canvas is ever tainted. Gate criteria in §6. The privacy copy is the honest "Nothing leaves your device", never "0 requests". | AC-F0.* |
| Roast: "same photo ≠ same item" | **Copy stays honest everywhere:** "Same photo ×5", never "same item", "identical product" or "dupe". The fold card header reads "These 5 listings use the same photo." A lint test fails the build if banned phrases appear in any user-facing string. | AC-F6.6, AC-X.1 |
| Roast: photo thieves | Ratings and review counts align under every rung; the most-reviewed listing is marked "Most established"; a 0-review rung that shares a photo with a well-reviewed listing gets a warning line. Never ranks by price alone. | AC-F6.3–F6.5 |
| Roast: variation families look like twins | Siblings with the same brand and title stem are "variants of one listing" and never form a twin group. | AC-F3.3 |
| Roast: DOM churn, Temu everything-is-a-twin | **Amazon.com search first, then Walmart search, as isolated adapter modules.** Temu is cut. Every other site is out of scope for v0.1. | AC-F1.* |
| Feasibility: "how often does page 1 really have twins?" | **Fixture corpus of saved results pages with clustering precision tests in CI** (F11). The corpus also measures how many twin groups real pages contain, which answers the question with data before launch. | AC-F11.* |
| Novelty 7 (audit capped by search budget) | Re-check run on 2026-10-20 (§13). No tool found that clusters the results page in place by photo. New neighbour found: Amaslop (hides junk brands via AI-generated safelists; no photo grouping, no prices). | §13 |
| AI dependence | **The core needs no AI.** Deterministic perceptual hashing only. The CLIP "looks identical" tier is a non-goal for v0.1 (opt-in stretch at most, later). | ADR |

## 5. Glossary

- **Listing:** one result tile on a search page (one ASIN on Amazon, one item id on Walmart).
- **Variant family:** listings with the same normalised brand and a title stem match (title with size, colour and pack tokens removed, token Jaccard ≥ 0.8). Collapsed into one listing before twin grouping, labelled "variants of one listing".
- **Twin group:** two or more listings (after variant collapse) whose thumbnails match per §8 and pass the title sanity check. Shown as "Twin A ×5".
- **Products (pill count):** listings minus the extra members of twin groups and variant families. "60 listings → 47 products" means 47 distinct product photos remain. See open question Q1.
- **Brand tax (group):** highest minus lowest comparable price in a twin group (per-unit when pack sizes differ, §8.5). **Brand tax (pill):** the largest group brand tax on the current query, rounded down to whole dollars ("up to $18").
- **Most established:** the member with the most reviews (ties: higher rating, then earliest in the page order).

## 6. MVP features

Each feature lists behaviour and testable acceptance criteria (AC). "Fixture" means the corpus in F11 served locally; timings are measured on the reference machine in the ADR.

### F0. Day-1 spike: prove the hashing path (gate for everything else)

Build nothing else until this passes. A throwaway WXT build with one content script on `amazon.com/s*` collects the thumbnail URLs on a real results page and sends them to the hasher context, which fetches each URL, decodes it with `createImageBitmap(blob)`, draws it to an `OffscreenCanvas` and reads `getImageData`.

- **AC-F0.1** On three real Amazon search pages (laptop stand, LED strip, phone tripod) in Chrome stable, ≥ 95% of tile thumbnails decode to pixels with no `SecurityError` (tainted canvas) and no CORS failure.
- **AC-F0.2** Hashing 60 thumbnails completes in ≤ 1,500 ms p95 from "URLs received" to "hashes returned", cold hasher.
- **AC-F0.3** The spike logs, per run, how many fetches were served from the HTTP cache (`PerformanceResourceTiming.transferSize === 0`) versus re-downloaded, and the exact set of hosts contacted. The result is written into the ADR and the privacy copy is adjusted to match what was measured. Every contacted host must be the store's image CDN.
- **AC-F0.4** The same path works in Firefox (≥ 140, the first version that reads `data_collection_permissions`) from the MV3 background page (no offscreen API there).
- **AC-F0.5** One Walmart search page passes AC-F0.1 with Walmart's image host.
- **Fallback if F0 fails:** documented in the ADR (service-worker `OffscreenCanvas` path; then reading pixels from same-size `<img>` re-requests with `crossorigin` only if the CDN sends CORS headers). If no path passes, the project stops and reports, rather than shipping a hashing path that fails silently.

### F1. Site adapters (Amazon.com search, then Walmart search)

One isolated module per store implementing the same interface (ADR, "Module layout": `src/adapters/types.ts`). Each adapter knows: which URLs it runs on, how to find tiles, how to read a tile into a `Listing`, how to detect lazy-loaded tiles, where to insert a fold card, and how to read the query and page number.

Extracted per tile: image URL (the one the page displayed), title, price (and price range low end, "from"), rating, review count, sponsored flag, listing id (`data-asin` on Amazon; item id on Walmart), brand (byline where present, else first title token heuristic marked low confidence).

- **AC-F1.1** On every Amazon fixture page, the adapter extracts ≥ 98% of organic and sponsored result tiles with a non-empty id, title and image URL; ≥ 95% have a price where the page shows one.
- **AC-F1.2** Non-product widgets (editorial carousels, "Overall Pick" badges' surrounding widgets, video tiles, related-search blocks) produce zero listings.
- **AC-F1.3** Tiles that load lazily after scroll are picked up within 500 ms of insertion (MutationObserver), with no re-hashing of tiles already seen.
- **AC-F1.4** Walmart adapter meets AC-F1.1–1.3 on Walmart fixtures. It ships only after Amazon passes the full AC set.
- **AC-F1.5** Content scripts match only `https://www.amazon.com/s*` and `https://www.walmart.com/search*`. On any other URL nothing runs and nothing is injected.
- **AC-F1.6** A store DOM change that breaks an adapter degrades to the pill's error state ("Couldn't read this page's listings…", F4) and never throws into the page or breaks the store's own UI.

### F2. Thumbnail hashing

For each listing: 64-bit dHash, 64-bit pHash (DCT), and a coarse colour signature, computed in the hasher context from the thumbnail the page already loaded (ADR, "Runtime architecture").

- **AC-F2.1** Hash functions are pure TypeScript over RGBA buffers, with our own area-average resample, so Node tests and the browser produce identical hashes for identical pixels.
- **AC-F2.2** Synthetic robustness set (F11): a photo and its JPEG re-encode (q 60–95), 0.5–2× resize and ≤ 3% border crop stay within pHash Hamming ≤ 6 in ≥ 98% of cases. Two different products on white backgrounds exceed 6 in ≥ 99% of cases.
- **AC-F2.3** A hash cache (keyed by normalised image URL) means a thumbnail seen once in a browser session is never fetched again in that session.
- **AC-F2.4** Every fetch URL is checked against the per-store image-host allowlist before the request is made; a non-allowlisted URL is skipped and counted, never fetched (unit-tested).

### F3. Clustering

- **AC-F3.1** Two listings are a twin edge when pHash distance ≤ 6 **and** dHash distance ≤ 10 **and** colour-signature distance ≤ the calibrated threshold **and** the title sanity check passes (they share at least one non-stopword head-noun token, e.g. "stand", "strip", "tripod"). Thresholds live in one constants module and are tuned only by the F11 corpus.
- **AC-F3.2** Groups form by union-find over edges, then each group is checked against its medoid: a member more than pHash 8 from the medoid is split off (prevents chaining).
- **AC-F3.3** Variant families (same normalised brand, title-stem Jaccard ≥ 0.8) are collapsed before grouping and labelled "variants of one listing"; they never form a twin group on their own.
- **AC-F3.4** Group letters are assigned A, B, C… in order of first appearance in the session for that query and stay stable across re-scans and pages.
- **AC-F3.5** Clustering 200 listings takes ≤ 50 ms in the content script (pure function, unit-benchmarked).

### F4. Summary pill (passive, every search)

A small pill in the bottom-right corner of the page (bottom-left if the store has a chat widget there; adapter decides).

- **AC-F4.1** On a fixture page with 60 tiles, the pill appears ≤ 1,500 ms after the last initial tile has loaded, showing listings, products, twin group count and the largest brand tax, e.g. "60 listings → 47 products · 6 twin groups · up to $23 brand tax". The separators are drawn dividers, not middle-dot characters; the accessible name reads "60 listings, 47 products, 6 twin groups, up to $23 brand tax" (the visible words with commas, so it contains the visible label, WCAG 2.5.3; screen readers say "23 dollars").
- **AC-F4.2** States: scanning ("Checking 60 photos…" with a determinate count), result, **no twins** ("60 listings, no shared photos on this page"), **error** ("Couldn't read this page's listings. The store may have changed its layout." with a "Report layout" link that opens a prefilled GitHub issue containing no page content), **paused** (site disabled in settings: no pill at all).
- **AC-F4.3** The pill never shifts page layout (fixed-position, in a shadow root) and never covers the store's own checkout or cart controls (adapter supplies an avoid-rect).
- **AC-F4.4** The pill can be dismissed for the current page (`×`, Esc while focused) and turned off per store in settings.
- **AC-F4.5** With session memory on, a second-page visit shows the session total: "120 listings across 2 pages → 71 products · 9 twin groups".

### F5. Rings and badges

- **AC-F5.1** Clicking the pill or pressing `T` rings every twin group member: a 3 px ring in the group's colour, a group-specific ring pattern (solid, dashed, dotted, double, repeating for groups past D), and a badge "Twin A ×5". Groups are never distinguished by colour alone.
- **AC-F5.2** Ring colours meet ≥ 3:1 against the tile background in both themes; badge text ≥ 4.5:1 (values in DESIGN.md).
- **AC-F5.3** Rings follow their tiles through scroll, resize and lazy loading with no drift (they live inside each tile, not in a page-level layer).
- **AC-F5.4** Hovering or focusing a badge outlines the other members of its group and shows "Same photo as 4 other listings on this page" (or "…seen 9× across 3 pages" with session memory).
- **AC-F5.5** `T` again removes all rings instantly (0 ms: frequent actions do not animate).

### F6. Fold twins (signature moment)

`F` (or "Fold twins" on the pill) folds each twin group into one card placed where its first member was; the other members are hidden. `F` again unfolds.

- **AC-F6.1** The fold card shows the group photo, header "These 5 listings use the same photo", and a horizontal price ladder with one rung per member, sorted by comparable price, each rung a link to that listing.
- **AC-F6.2** Under every rung, aligned in columns: price (with "per unit" when pack sizes differ), rating, review count, brand, and a "Sponsored" tag where applicable.
- **AC-F6.3** The tag "Brand tax +$23.00" shows the group's brand tax (highest minus lowest comparable price), with the cheapest and priciest rungs labelled. No tag when fewer than two members have prices.
- **AC-F6.4** The member with the most reviews is labelled "Most established".
- **AC-F6.5** A rung with 0–9 reviews that shares a photo with a member having ≥ 100 reviews shows "Few reviews. Uses the same photo as a listing with 14,203 reviews." (real numbers from the page).
- **AC-F6.6** No string in the card says "same item", "same product", "identical product", "dupe" or "knockoff" (copy lint, AC-X.1).
- **AC-F6.7** Folding and unfolding restores the store's grid exactly: the same tiles visible in the same order, no leftover attributes or styles (DOM snapshot test on fixtures).
- **AC-F6.8** The motion follows DESIGN.md "Signature moment" frame by frame, is interruptible (pressing `F` mid-fold reverses from the current position), and becomes a 150 ms crossfade under `prefers-reduced-motion`.

### F7. Proof lens

From a badge or fold card ("Check the pixels", or `P` on a focused group), a dialog overlays two of the group's photos.

- **AC-F7.1** Defaults to the cheapest and the priciest rung; either side can be switched to any member.
- **AC-F7.2** Onion-skin mode: a slider (keyboard: arrows 5%, Shift+arrows 25%) blends photo A over photo B.
- **AC-F7.3** Difference mode: photo A over photo B with `mix-blend-mode: difference`; identical photos render black.
- **AC-F7.4** Readout "Photos 99.6% identical" with "0.4% of pixels differ" beneath it, computed in the hasher context at 256 × 256 (per-pixel max channel difference > 24/255 counts as differing). The number is computed, never estimated or rounded up; "100%" appears only when zero pixels differ.
- **AC-F7.5** The dialog traps focus, closes with Esc and returns focus to its trigger.

### F8. Session memory across result pages

- **AC-F8.1** Listings and hashes are stored per query key (store + normalised query + sort/filter params, ignoring the page parameter) in `storage.session`, so page 2 and 3 of the same query join groups found on page 1.
- **AC-F8.2** Badges and fold cards show cross-page counts: "seen 9× across 3 pages". Rungs from other pages are marked "page 2" and link there.
- **AC-F8.3** Memory is cleared when the browser session ends, or by "Clear this session" in the popup (with a 6 s Undo toast), or per settings toggle "Remember twins across pages" (default on).
- **AC-F8.4** At most 50 queries are kept (least recently used evicted); total stored per query ≤ 200 KB.

### F9. Popup

Opens from the toolbar icon (360 × up to 520 px).

- **AC-F9.1** On a supported page: this page's counts, the per-store on/off switch, and the shortcut list with keycaps.
- **AC-F9.2** On an unsupported page: "Factory Twins works on Amazon.com and Walmart.com search pages." plus the two example links.
- **AC-F9.3** Privacy panel: "Nothing leaves your device." Below it, the measured session counts by host, e.g. "184 image reads this session, all from m.media-amazon.com. 0 to anyone else." The counts come from the hasher's own counter, not a hard-coded string.
- **AC-F9.4** First paint ≤ 100 ms (state read from `storage.session`), no network.

### F10. Options page

- **AC-F10.1** Per-store enable switches; "Show the summary pill automatically" (default on); "Ring twins automatically" (default off); "Remember twins across pages" (default on); single-key shortcuts on/off (default on); matching strictness Strict / Standard (Standard = §8 defaults; Strict = pHash ≤ 4).
- **AC-F10.2** Settings persist in `storage.local` and apply to open tabs without reload.

### F11. Fixture corpus and clustering precision in CI

- **AC-F11.1** `tests/fixtures/amazon/` holds ≥ 12 sanitised results pages across ≥ 8 query categories, and `tests/fixtures/walmart/` ≥ 6, each with `page.html` (sanitised DOM), `hashes.json` (per-listing hashes computed at capture), `labels.json` (human-labelled twin groups and variant families) and `PROVENANCE.md` (query, date, capture tool, sanitiser version).
- **AC-F11.2** CI runs clustering over every fixture's `hashes.json` and fails if pairwise **precision < 0.97** or **recall < 0.85** against `labels.json`, overall and per store.
- **AC-F11.3** CI runs the adapters over every `page.html` and fails on any AC-F1.1/F1.2 regression.
- **AC-F11.4** A synthetic visual corpus (generated deterministically, ADR "Fixture strategy") tests the hash functions end to end on real pixels, including the e2e "laptop stand" demo page.
- **AC-F11.5** No store product photo is committed to the repo; real-page fixtures carry hashes, not images.

### F12. Keyboard

- **AC-F12.1** In-page single keys, active only when no text field is focused and the page has a pill: `T` rings, `F` folds, `P` opens the Proof lens on the focused or first group, `Esc` closes the lens or collapses the pill. Can be turned off (F10).
- **AC-F12.2** Manifest `commands`: `Alt+Shift+T` rings, `Alt+Shift+F` folds (user-rebindable in the browser's shortcut settings).
- **AC-F12.3** Every overlay control is reachable with Tab inside the shadow root, with a visible focus ring.

### Web app (`site/`, route `/app/`)

A separate static package that lets people on a phone (where extensions cannot run) try the same engine from a link. It imports the engine from `src/core/index.ts` through a Vite alias and adds only browser glue (image decoding, file picking, a service worker). It is not part of the extension bundle and does not change the extension's non-goals (no mobile browser support for the extension itself).

- **AC-W.1** The landing page's hero has a link "Try it in your browser, no install" that opens `/app/`. The page also links to it from the nav, the privacy section and the install section.
- **AC-W.2** The app shows the line "Runs entirely in your browser. Nothing is uploaded." in every state. A Playwright test records every request on the empty, sample, photo-picking and error flows and asserts that each one goes to the app's own origin (or is a `blob:`/`data:` URL); nothing is sent anywhere else. There is no analytics code, no account and no server.
- **AC-W.3** The app imports the engine only through the `@engine` alias (`src/core/index.ts`). A unit test fails if any file under `site/src` defines its own hashing, clustering, brand-tax or pixel-diff function, or imports from `src/` by a relative path. Any code that touches a browser API the engine leaves to its caller (decoding an image to RGBA, fetching a bundled file) lives in `site/src/shared/measure.ts` and is listed in `site/HANDOFF.md`.
- **AC-W.4** Four ways in: pick photos (camera roll or desktop files, several at once), drop files, paste an image from the clipboard, or open the bundled sample results page. Up to 60 photos are checked at a time; more are skipped with a notice.
- **AC-W.5** The sample is a bundled made-up Amazon-style results page of 60 listings. It is read by the real Amazon adapter and `scanDocument`, with images hashed by the engine, and yields exactly 6 twin groups (unit test, headless).
- **AC-W.6** Picked photos: a resized, re-compressed copy of a photo groups with its original and a different photo does not (unit and e2e tests). Price and brand are optional fields under each photo; with two prices in one group the fold card shows the brand tax and the price ladder (e2e: $34.99 and $11.99 gives "+$23.00").
- **AC-W.7** Every state exists and is tested: empty (explains itself, "Try a sample" button), loading (skeleton and the engine's "Checking N listings" wording), error (what went wrong, "Nothing was uploaded.", a way forward), and success (summary pill, status line, rings, fold, ladder).
- **AC-W.8** The Proof lens opens from a fold card ("Check the pixels") with onion-skin and difference modes and a readout measured by the engine's `pixelDiff`. On a 375 px touch viewport, dragging a finger across the photo changes the blend (e2e with real touch events).
- **AC-W.9** Mobile first: designed at 375 px, then 768 and 1440. No horizontal page scroll at any of the three widths, with results shown and folded (e2e). Every button, link and field is at least 44 x 44 px at 375 px (e2e measures them).
- **AC-W.10** Installable and offline: a valid manifest (`display: standalone`, 192, 512 and maskable icons) and a service worker that precaches every file the app needs, including the sample page and its images. After one online visit, with the network switched off, a reload still shows the app and the sample still loads and groups (e2e `setOffline`). The service worker has no fetch of its own.
- **AC-W.11** Same tokens as the extension: all colour, type, spacing and motion values come from the generated `tokens.css` (no hex literals in `site/src` styles). Light and dark follow `prefers-color-scheme`; motion follows `prefers-reduced-motion`.
- **AC-W.12** Budget: initial JS of the landing page and of the app each at most 120 KB gzip (checked by `site/scripts/check-dist.mjs`, actual about 25 KB); no WebGL; the recording's poster (`landing/loop-poster.avif`, a social asset) at most 80 KB AVIF. On Chrome with 4x CPU slowdown and Fast 4G emulation at 375 px, LCP at most 2.0 s and CLS at most 0.01 for both pages (DevTools performance trace). Lighthouse accessibility, best practices and SEO at least 95 on both pages.
- **AC-W.13** Truth: all listings, brands, prices, ratings and review counts in the sample and on the landing page are made up and labelled "made up" where they appear. No store logo or trade dress, no testimonial, no star or install count.
- **AC-W.14** Same layout as the extension's overlay (the site redraws it from the engine's view models; see `site/HANDOFF.md`). Fold card: a rail with the shared photo and its two actions, the tinted header band with the title and badge, the price range with the brand-tax tag, and the ladder, whose bracket sits in its own column at the card's right edge with dashed extension lines from the tops of the Highest and Lowest bars. When the rungs and bracket do not fit beside the rail, the rail stacks above them; when they do not fit even then, the bracket is dropped (the tag still states the brand tax). A three-rung ladder does not scroll sideways at 375 px; a longer one scrolls, with an edge fade only on an edge that hides rungs. e2e: the app's first card at 375 and 1440, the landing's hero and brand-tax cards at 375, 768 and 1440.
- **AC-W.15** Pill: no line of a wrapped pill starts with a divider, and at 480 px and narrower the fold button takes its own row; while folded the pill offers "Unfold twins" (e2e checks every segment's divider). Proof lens: at 375 x 812 the measured number is on screen when the lens opens, without scrolling; the top and bottom photos are picked with one chip per listing (`aria-pressed`), and picking another chip re-measures (e2e).
- **AC-W.16** Product visuals on the landing page: the "real product" beat shows a screenshot of the extension itself, taken from `docs/screenshots/` (`pnpm shots:real` converts them, light and dark, phone and desktop); the hero demo is the live reproduction. e2e checks the right file loads in each colour scheme.

Run: `cd site && pnpm build && pnpm test && pnpm test:e2e` (the e2e suite serves `dist/` with `scripts/serve-dist.mjs` on port 4180, a static server with real 404s and gzip).

### Cross-cutting

- **AC-X.1** Copy lint: a unit test scans all user-facing strings (`src/copy/*.ts`) for banned phrases (§1, AC-F6.6) and for lorem ipsum.
- **AC-X.2** No network call to any host except the store image allowlist (code-review test greps for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, remote `<script>`/`<link>`).
- **AC-X.3** All overlay UI renders inside shadow roots; no store styles leak in, none of ours leak out; all text is set with `textContent`, never `innerHTML` from page data.
- **AC-X.4** Light and dark: the overlay follows the store page's actual background luminance; popup and options follow `prefers-color-scheme`.

## 7. Non-goals (v0.1)

- Temu, AliExpress, eBay, Etsy, non-US Amazon marketplaces, product detail pages.
- Crawling extra result pages, cross-retailer matching, price history, price alerts.
- The CLIP "looks identical" tier, or any AI/LLM call. No BYO key exists in v0.1.
- Accounts, sync, cloud, analytics, telemetry, crash reporting.
- Deciding which listing is genuine, or recommending a purchase.
- Mobile browsers and Safari.

## 8. Matching rules (normative)

1. **Image source:** the URL the tile actually displayed (`currentSrc`), normalised only to strip tracking query parameters. The adapter never rewrites a size token, so the hasher re-reads the same file the page already loaded.
2. **Hashes:** grayscale (Rec. 709 luma) after area-average resample; dHash on 9 × 8; pHash = 32 × 32 DCT-II, top-left 8 × 8 without DC, median threshold; colour signature = mean OKLab of a 4 × 4 grid (48 numbers, quantised to 8 bits). Letterbox to square on white before resampling so aspect differences do not move hashes.
3. **Edge rule:** AC-F3.1. **Group rule:** AC-F3.2.
4. **Title sanity:** lowercase, strip brand and stop words, singularise; share ≥ 1 head-noun token from the last 4 meaningful tokens, or token Jaccard ≥ 0.2.
5. **Pack sizes:** parse "2 pack", "pack of 3", "set of 4", "x2", "(2-Pack)", "3 count" from the title; when members' pack counts differ, the ladder compares per-unit price and says "per unit". Unparseable → pack count 1, marked uncertain, and the brand tax uses only members with the same pack count.
6. **Prices:** USD only (both stores' US sites). A price range uses its low end, labelled "from". Missing price → rung shows "No price shown" and is excluded from the brand tax.

## 9. Data model

TypeScript shapes (module ownership in the ADR's "Module layout").

```ts
type StoreId = 'amazon-us' | 'walmart-us';

interface Listing {
  id: string;                // ASIN or Walmart item id
  store: StoreId;
  page: number;              // result page number (1-based)
  position: number;          // order on its page
  url: string;               // listing link (relative paths resolved)
  imageUrl: string;          // currentSrc, tracking params stripped
  title: string;
  brand: string | null;
  brandConfidence: 'byline' | 'heuristic' | 'none';
  price: { amount: number; currency: 'USD'; isFromRange: boolean } | null;
  packCount: number;         // 1 when unknown
  packCountCertain: boolean;
  rating: number | null;     // 0–5
  reviewCount: number | null;
  sponsored: boolean;
}

interface ImageHashes { dhash: string; phash: string; color: Uint8Array /* 48 bytes */; w: number; h: number; }

interface TwinGroup {
  letter: string;            // 'A', 'B', … stable per query session
  memberIds: string[];       // after variant collapse, ordered by comparable price
  medoidId: string;
  brandTax: { amount: number; perUnit: boolean; lowId: string; highId: string } | null;
  mostEstablishedId: string | null;
  pagesSeen: number[];
}

interface VariantFamily { leaderId: string; memberIds: string[]; }

interface QuerySession {      // storage.session, key `q:<store>:<hash of normalised query>`
  key: string; store: StoreId; query: string;
  listings: Record<string, Listing>;
  hashes: Record<string, ImageHashes>;  // by listing id
  letters: Record<string, string>;      // medoid id → letter, for stability
  lastSeen: number;
}

interface Settings {           // storage.local, key `settings`
  stores: Record<StoreId, boolean>;
  autoPill: boolean; autoRings: boolean; sessionMemory: boolean;
  singleKeys: boolean; strictness: 'standard' | 'strict';
}

interface NetworkCounter {     // storage.session, key `net`
  byHost: Record<string, number>; blocked: number; cacheHits: number;
}
```

## 10. Privacy model

| Data | Where | Lifetime | Leaves the device? |
|---|---|---|---|
| Listings (titles, prices, ratings, ids) read from the page | Content-script memory; `storage.session` when session memory is on | Until tab closes / browser session ends / "Clear this session" | No |
| Image hashes (not images) | `storage.session` hash cache, ≤ 5,000 entries | Browser session | No |
| Decoded thumbnail pixels | Hasher context memory only | Discarded right after hashing | No |
| Settings | `storage.local` | Until changed or uninstalled | No |
| Network counter | `storage.session` | Browser session | No |

**Network policy.**
- The extension makes **no request to any server we run**: there is none. No analytics, telemetry, crash reporting, update pings beyond the browser store's own, remote config or remote code.
- The only requests it makes are **thumbnail re-reads from the store's own image CDN** (allowlist: `m.media-amazon.com`, `images-na.ssl-images-amazon.com` for Amazon; `i5.walmartimages.com` for Walmart; the spike may narrow or extend this list and the ADR records the final list). They are sent with `credentials: 'omit'`, no referrer, and `cache: 'force-cache'`, for the exact image URL the page already displayed.
- Whether these reads hit the HTTP cache depends on the browser's cache partitioning; the spike measures it (AC-F0.3), and the popup shows real counts. Copy therefore says "Nothing leaves your device" and "image reads from the store's own image server", never "0 network requests".
- No BYO key, no AI call, no user-initiated network feature exists in v0.1.
- Permissions: `storage`, `offscreen` (Chrome only), host permissions for the image CDNs only; content scripts on the two search URL patterns only. No `tabs`, no `<all_urls>`, no `webRequest`, no `scripting`.

## 11. Platform matrix

| Platform | Status v0.1 | Hasher context | Notes |
|---|---|---|---|
| Chrome ≥ 120 (Windows, macOS, Linux) | **Primary**, fully tested (unit + e2e) | Offscreen document | MV3 service worker as coordinator |
| Edge, Brave (Chromium) | Expected to work, smoke-tested manually only | Offscreen document | Same build as Chrome |
| Firefox ≥ 140 desktop | **Supported build**, unit + manual smoke | MV3 background page (has DOM; no offscreen API) | `browser_specific_settings.gecko.id` set; `storage.session` available since 115 |
| Safari, mobile browsers, store apps | Not supported | n/a | Stated on landing page |

Stores: `amazon.com` (US) search and `walmart.com` (US) search only.

## 12. Ten-second demo script (shot by shot)

Recorded from the e2e "laptop stand" demo page (synthetic listings in a store-like grid, labelled "Demo page with made-up listings" in the corner) unless the maker records a real search by hand. The real store's logo or brand marks never appear in a synthetic recording.

| Time | Shot | On screen | Proof |
|---|---|---|---|
| 0.0–1.5 s | Search results for "laptop stand", 60 tiles, nothing unusual | Bottom-right pill slides in: "60 listings → 47 products · 6 twin groups · up to $23 brand tax" | Value with zero clicks |
| 1.5–3.0 s | Cursor clicks the pill | Five tiles get a teal solid ring and "Twin A ×5"; four get an amber dashed ring and "Twin B ×4" | Same photo, visibly |
| 3.0–5.5 s | Key-press caption "F" | Twin A's five tiles slide into one card: ladder $11.99 · $13.49 · $15.99 · $19.99 · $34.99 "ProBrand", tag "Brand tax +$23.00"; ratings and review counts under each rung; $11.99 rung marked "Most established" | The signature moment |
| 5.5–6.5 s | Cursor rests on the $34.99 rung | "ProBrand · 4.4 · 212 reviews" beside the cheapest's "4.5 · 3,918 reviews" | Evidence, not verdict |
| 6.5–8.5 s | Key-press caption "P" | Proof lens: $11.99 and $34.99 photos overlap; slider sweeps; switch to Difference and the frame goes black | Check it by eye |
| 8.5–10.0 s | Hold | Readout "Photos 99.6% identical", small line "0.4% of pixels differ"; end card "Nothing leaves your device." | Honest, local |

All prices, ratings and review counts in the demo are illustrative, from the synthetic page, and the recording says so.

## 13. Novelty re-check (2026-10-20)

Searches run in this stage: Chrome Web Store / web for "group duplicate listings same product photo Amazon search", GitHub for "perceptual hash amazon search identical products", and "same product different brand names amazon extension 2026". Findings:
- **Knockoff** (Chrome/Firefox, July 2026): brand-name lists and heuristics; hides, dims or labels pseudo-brands; no image comparison.
- **Amaslop** (Product Hunt, about Sept 2026): hides "duplicate, junk and scam brands" using AI-generated safelists synced to a local extension; the listing does not describe photo grouping or price comparison. Closest new neighbour by vocabulary; different mechanism.
- **Dupely**, **Reverse Dropshipping**, **Dropheus**, **Search by Image on Amazon**: one product at a time, outward search, cloud.
- GitHub: only general perceptual-hash libraries (imagehash, perception).

No tool found that clusters the visible results page in place by photo with a price ladder. Residual risk unchanged: a closed tool could add it. Positioning copy should name the mechanism (photo grouping on the page you are on), not claim "first".

## 14. Risks, with owners

| Risk | Mitigation | Owner stage |
|---|---|---|
| Novelty unconfirmed; Dupely/Knockoff/Amaslop could add photo grouping | §13 re-check; ship fast; mechanism-led positioning | Ship kit |
| Most Amazon shopping happens in the mobile app | Desktop-only scope stated honestly | All copy |
| Amazon's search DOM churns | Isolated adapters, fixture CI, graceful error pill, "Report layout" link | Core, tests |
| Canvas/CORS path unproven | F0 gate on day 1 | Core (first task) |
| A same-photo group mixes an original and a knockoff | Evidence-only UI, most-established marker, few-reviews warning | UI |
| Pack sizes and multi-packs inflate brand tax | Per-unit comparison (§8.5) | Core |
| Fixture legality | Sanitised DOM + hashes only, no store images committed | Core |

## 15. Open questions

- **Q1.** Pill wording "47 products" versus "47 distinct photos". "products" is the default; the UI stage should test whether "products" reads as a sameness claim, and if the design critic flags it, switch to "47 distinct photos" in both the pill and landing copy.
- **Q2.** Exact Walmart image host list and whether Walmart tiles expose a stable item id in the DOM (spike AC-F0.5 answers).
- **Q3.** Whether Amazon's page CSP blocks web-accessible extension fonts inside the shadow root (spike checks; fallback is the metric-matched system stack in DESIGN.md).
