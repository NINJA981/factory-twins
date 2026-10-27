# ADR-0001: Architecture for Factory Twins v0.1

**Status:** Accepted (architect stage). The hasher-context decision (Decision 3) stays *Proposed* until the day-1 spike (SPEC F0) passes, then it is updated with the measured results.
**Date:** 2026-10-20
**Deciders:** studio architect; reviewed by the code and security reviewer stage.

## Context

Factory Twins is a browser extension that, on Amazon.com and Walmart.com search pages, perceptually hashes the result thumbnails the page already loaded, clusters listings that share a photo, and paints rings, a summary pill, fold cards and a Proof lens over the store's own grid (SPEC.md).

Forces:
- **Tainted canvas.** A content script cannot read pixels of cross-origin `<img>` elements; drawing them to a canvas taints it. Pixels must be read in an extension context that holds host permission for the image CDN.
- **MV3 lifecycles.** The Chrome service worker has no DOM and is terminated when idle. Offscreen documents have DOM but only the `runtime` extension API (no `storage`). Firefox MV3 has no offscreen API but runs an event-page background with a DOM.
- **Privacy promise.** No backend, no telemetry. The only network reads allowed are the store's own thumbnails.
- **DOM churn.** Store markup changes often. One store's breakage must not take the product down.
- **Testability.** Agents and CI must test clustering offline, without committing store photos.
- **Overlay budget.** The content script runs on every search; it must be small and must never shift or break the store's layout.
- **No AI in the core** (SPEC §4). No LLM, so the claude-api skill does not apply to v0.1.

## Decision

1. **WXT 0.21.4** builds one codebase into Chrome MV3 and Firefox MV3 targets.
2. **Content script per store** (Amazon, Walmart), each a thin entrypoint over an isolated **adapter module** implementing one `StoreAdapter` interface. Shared overlay, clustering and state code is store-agnostic.
3. **Hasher context:** a Chrome **offscreen document** (`reasons: ['BLOBS']`) or, on Firefox, the **background page itself**, behind one `Hasher` interface. It fetches allowlisted thumbnail URLs with `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'force-cache'`, decodes with `createImageBitmap(blob)`, and reads pixels from an `OffscreenCanvas` that never touched a cross-origin image element, so it is never tainted.
4. **Service worker / background** is the coordinator: owns `storage.session` (hash cache, query sessions, network counter) and `storage.local` (settings), routes messages, creates and reuses the offscreen document.
5. **Pure-function core** (hashing, clustering, title and pack parsing, brand tax) in `src/core/`, with no browser APIs, unit-tested in Node.
6. **Overlay UI** rendered in **shadow roots**: one top-level host (pill, fold-card portal targets, Proof lens) plus a lightweight per-tile host for rings and badges. React 19 with Tailwind v4 tokens; signature motion uses the Web Animations API (WAAPI), not Motion, to keep the content-script bundle small.
7. **Popup and options** are ordinary WXT React pages with Tailwind v4, Radix primitives and Motion.
8. **Fixtures:** sanitised result-page DOM plus precomputed hashes and human labels (no store images), and a deterministic synthetic image corpus for pixel-level tests and the e2e demo page.

## Options considered

### Where to read thumbnail pixels

| Option | Complexity | Privacy / honesty | Robustness | Verdict |
|---|---|---|---|---|
| **A. Offscreen document (Chrome) / background page (Firefox) fetch + `createImageBitmap`** | Med | Re-reads only allowlisted CDN URLs; requests visible in the extension's own DevTools, not the page's | High; DOM APIs available; survives SW idle-kill while busy | **Chosen** (picks.json names this path) |
| B. Service-worker `fetch` + `OffscreenCanvas` (no offscreen doc) | Low | Same as A | SW may be terminated mid-batch; long CPU work blocks message handling | Fallback if A's offscreen creation proves flaky |
| C. Content script draws `<img>` to canvas | Low | No extra requests | Fails: canvas tainted unless the CDN sends CORS headers, which we cannot rely on | Rejected |
| D. Content script re-requests images with `crossorigin="anonymous"` | Low | Extra requests from the page origin, visible in the page's network panel | Works only if the CDN answers with `Access-Control-Allow-Origin` | Last-resort fallback, spike checks headers |
| E. Hash by image URL only (no pixels) | Low | No requests | Fails: twins are often re-uploads with different URLs | Rejected |

**Pros of A:** proven pattern; DOM available for decoding; pixels never leave memory. **Cons:** one more context; offscreen documents only get `runtime`, so storage writes go through the SW; cache partitioning may make re-reads real downloads (measured in F0, stated honestly in copy).

### Overlay strategy

| Option | Notes | Verdict |
|---|---|---|
| **Per-tile shadow host for rings + one top-level shadow host** | Rings move with tiles natively (no scroll sync); fold cards are inserted as one sibling host per group; tiles hidden with an attribute and one scoped page stylesheet (`[data-ft-hidden]{display:none!important}`) | **Chosen** |
| Single fixed-position canvas/SVG layer tracking tile rects | Needs rAF scroll/resize sync, drifts under lazy layout | Rejected |
| Rewriting the store's grid DOM | Breaks store scripts and restore | Rejected |

### UI framework in the content script

| Option | gz cost | Verdict |
|---|---|---|
| **React 19 + WAAPI** (Motion excluded from the content bundle) | ~58 KB React + our code; budget ≤ 110 KB gz total | **Chosen**: one stack across all surfaces (studio bible) |
| Preact | ~4 KB | Rejected: second component model for contributors; bible standardises React |
| Vanilla DOM | 0 | Rejected: fold card and lens have enough state to justify a component model |

## Stack (pinned with `npm view <pkg> version`, 2026-10-20)

Pin exact versions (no `^`/`~`) in `package.json`.

**Runtime**

| Package | Version | Use |
|---|---|---|
| `wxt` | 0.21.4 | Build, manifest, entrypoints, dev runner; includes `wxt/utils/storage` (`@wxt-dev/storage`) and `wxt/testing` (fake browser) |
| `@wxt-dev/module-react` | 1.2.2 | React integration (pulls `@vitejs/plugin-react` 6.x) |
| `react`, `react-dom` | 19.3.1 | UI |
| `@webext-core/messaging` | 4.0.0 | Typed `runtime` messaging between content, SW and offscreen |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | Token-driven styling (DESIGN.md tokens in `@theme`) |
| `radix-ui` | 1.8.1 | Popup/options: Switch, Tooltip, ToggleGroup; overlay: Dialog (Proof lens) with portal container inside the shadow root |
| `motion` | 14.4.0 | Popup/options only (`MotionConfig reducedMotion="user"`) |
| `lucide-react` | 1.60.0 | Icons, 16 px, 1.5 stroke |
| `@fontsource-variable/rethink-sans` | 5.3.0 | UI face (latin wght, 35.7 KB woff2) |
| `@fontsource-variable/bricolage-grotesque` | 5.3.0 | Display face; full-axes file is 131.5 KB, so the extension ships a build-time instance (see below) |

**Dev / test**

| Package | Version | Use |
|---|---|---|
| `typescript` | **6.0.3** | Strict mode. Not 7.0.2: `typescript-eslint` 8.72.0 peers `typescript >=4.8.4 <6.1.0` |
| `vite` | 8.3.4 | Peer of wxt (`^8.0.0-0` accepted) and vitest |
| `vitest`, `@vitest/coverage-v8` | 5.0.5 | Unit tests |
| `happy-dom` | 21.0.3 | DOM for adapter and overlay unit tests |
| `@playwright/test` | 1.64.1 | e2e with `--load-extension` |
| `@axe-core/playwright` | 4.14.0 | a11y in e2e |
| `eslint` | 10.13.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.72.0, `eslint-plugin-react-hooks` 7.1.1, `globals` 17.13.0 | Lint |
| `prettier` | 3.9.10 | Format |
| `@types/react`, `@types/react-dom` | 19.3.0 | Types |
| `@types/node` | 24.19.2 | Node 24 toolchain |
| `web-ext` | 10.8.0 | wxt peer (`>=9.2.0`), Firefox run/lint |
| `sharp` | 0.35.5 | Decode/encode in Node for synthetic corpus generation and pixel tests |
| `subset-font` | 2.9.0 | Instance Bricolage at `wdth 85, opsz 96` and subset to the overlay's glyphs |
| `culori` | 4.0.2 | CI check: token contrast and ΔE_OK ≥ 0.06 from the bible §4.4 blocklist |
| `size-limit`, `@size-limit/file` | 14.2.0 | Bundle budgets in CI |

Checked but not used: `idb-keyval` (storage.session suffices), `zustand` (React state + messaging suffice), `linkedom`/`jsdom` (happy-dom covers it).

Node 24 and pnpm on Windows 11 are the reference toolchain.

## Module layout

```
factory-twins/
  wxt.config.ts                 # manifest: permissions, host_permissions, commands, gecko id
  entrypoints/
    background.ts               # coordinator (Chrome SW / Firefox event page)
    offscreen/index.html        # Chrome-only hasher page (unlisted page)
    offscreen/main.ts
    amazon.content/index.tsx    # matches https://www.amazon.com/s*
    walmart.content/index.tsx   # matches https://www.walmart.com/search*
    popup/                      # index.html, main.tsx, App.tsx
    options/                    # index.html, main.tsx, App.tsx
  src/
    core/                       # pure TS, no browser APIs
      hash/resample.ts          # area-average resample, letterbox-to-square
      hash/dhash.ts  hash/phash.ts  hash/color.ts  hash/hamming.ts
      hash/pixelDiff.ts         # Proof lens % differing pixels
      cluster/edges.ts  cluster/unionFind.ts  cluster/groups.ts  cluster/variants.ts
      text/normalize.ts  text/titleSanity.ts  text/packCount.ts  text/brand.ts
      price/brandTax.ts  price/parse.ts
      session/queryKey.ts  session/merge.ts   # cross-page merge, stable letters
      constants.ts              # every threshold, tuned only by fixtures
    adapters/
      types.ts                  # StoreAdapter interface
      amazon/selectors.ts  amazon/extract.ts  amazon/query.ts  amazon/index.ts
      walmart/selectors.ts walmart/extract.ts walmart/query.ts walmart/index.ts
    hasher/
      types.ts                  # Hasher interface
      fetchPixels.ts            # allowlist check, fetch, createImageBitmap, OffscreenCanvas
      allowlist.ts              # per-store image hosts
      chromeOffscreen.ts        # SW side: ensure/reuse offscreen doc, message it
      backgroundPage.ts         # Firefox: hash in place
    messaging/protocol.ts       # typed messages (defineExtensionMessaging)
    storage/items.ts            # settings, query sessions, hash cache, net counter (wxt storage.defineItem)
    overlay/                    # content-script UI (React, shadow DOM)
      mount.ts  OverlayRoot.tsx  Pill.tsx  TileRing.tsx  FoldCard.tsx  PriceLadder.tsx
      ProofLens.tsx  keyboard.ts  foldMotion.ts (WAAPI)  pageScheme.ts
    ui/                         # shared React primitives for popup/options/overlay
    copy/strings.ts             # every user-facing string (copy-lint target)
    styles/tokens.css           # DESIGN.md tokens on :root, :host; light + dark
  public/fonts/                 # subsetted woff2 (generated by scripts/subset-fonts.ts)
  scripts/
    subset-fonts.ts
    capture-fixture.ts          # maintainer-only: Playwright capture of a real page to tests/fixtures/_raw (gitignored)
    sanitize-fixture.ts         # _raw → committed page.html + hashes.json
    gen-synthetic-corpus.ts     # deterministic synthetic images (sharp)
  tests/
    unit/                       # vitest
    fixtures/amazon/<slug>/{page.html,hashes.json,labels.json,PROVENANCE.md}
    fixtures/walmart/<slug>/...
    fixtures/synthetic/         # generated, committed (small)
    fixtures/demo/laptop-stand/ # e2e demo page + authored images
    e2e/                        # Playwright with the built extension
  site/                         # landing page package (built in a later stage)
```

## Runtime architecture

```
 store page (amazon.com/s, walmart.com/search)
 ┌──────────────────────────────────────────────┐
 │ content script (per store)                   │
 │  adapter.readTiles() → Listing[]             │
 │  MutationObserver for lazy tiles             │
 │  overlay (shadow roots): pill, rings,        │
 │  fold cards, Proof lens; keyboard            │
 │  cluster() runs here (pure, < 50 ms)         │
 └───────────┬──────────────────────────────────┘
             │ runtime messages (typed)
             ▼
 background: Chrome service worker / Firefox event page
 ┌──────────────────────────────────────────────┐
 │ hash cache lookup (storage.session)          │
 │ query session merge (storage.session)        │
 │ settings (storage.local)                     │
 │ network counter (storage.session)            │
 │ Chrome: ensureOffscreen() → forward misses   │
 │ Firefox: hash in place                       │
 └───────────┬──────────────────────────────────┘
             │ runtime messages
             ▼
 hasher (Chrome offscreen document | Firefox background page)
 ┌──────────────────────────────────────────────┐
 │ allowlist check → fetch(force-cache, omit)   │
 │ createImageBitmap(blob) → OffscreenCanvas    │
 │ getImageData → resample → dHash/pHash/color  │
 │ pixelDiff(a, b) for the Proof lens           │
 │ returns hashes + {host, fromCache} per URL   │
 └──────────────────────────────────────────────┘
```

**Scan sequence.** Content script reads tiles → sends `hashImages({store, urls})` → background answers cache hits immediately and forwards misses to the hasher in batches of 12 (concurrency 6) → hasher returns hashes plus per-URL `{host, fromCache}` → background writes the cache and counter, returns to the content script → content script asks background to `mergeQuerySession` (gets session listings and stable letters back) → clusters → renders the pill.

**Offscreen lifecycle.** `ensureOffscreen()` checks `runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']})`, creates the document once with a single in-flight promise, and closes it after 60 s with no work. Justification string: "Decode product thumbnails into pixels to compute perceptual hashes locally."

**Fold mechanics.** The adapter returns, per group, the leader tile and an insertion point. Fold inserts one shadow-host sibling before the leader (full grid row via the adapter's row rule), sets `data-ft-hidden` on members, and runs the FLIP ghost animation in the top-level overlay layer (ghost `<img>` elements using the page's own thumbnail URLs, which the page CSP already allows). Unfold reverses and removes every attribute and host it added.

**Proof lens pixels.** Visual blend is CSS (`mix-blend-mode: difference` on two `<img>` with the page's URLs) inside the shadow root. The percentage comes from `pixelDiff` in the hasher (decoded from the same allowlisted URLs). No pixel data or data-URLs are injected into the page.

**Theme.** `pageScheme.ts` samples the computed background of the results container: luminance < 0.4 → dark tokens on the overlay host, else light (store pages are light; this catches dark-mode extensions).

**Fonts in the overlay.** `@font-face` does not work when declared inside a shadow root in Chromium, so the content script adds one `<style id="ft-fonts">` to the document head declaring our families with `web_accessible_resources` URLs (`use_dynamic_url: true`). If the spike shows the page CSP blocks them (SPEC Q3), the overlay falls back to the metric-matched system stack in DESIGN.md.

**Manifest (v0.1).**
- `permissions: ["storage", "offscreen"]` (offscreen omitted from the Firefox build)
- `host_permissions`: `https://m.media-amazon.com/*`, `https://images-na.ssl-images-amazon.com/*`, `https://i5.walmartimages.com/*` (final list from the spike)
- content scripts: `https://www.amazon.com/s*`, `https://www.walmart.com/search*`, `run_at: document_idle`
- `commands`: `ring-twins` (Alt+Shift+T), `fold-twins` (Alt+Shift+F), `_execute_action`
- `web_accessible_resources`: `fonts/*.woff2` for the two content-script match patterns only
- default MV3 CSP; no remote code
- Firefox: `browser_specific_settings.gecko.id`, `strict_min_version: "128.0"`

**Allowlist enforcement.** `allowlist.ts` is the only place hosts are defined; `fetchPixels` refuses anything else before calling `fetch`. A test asserts the manifest `host_permissions` equal the allowlist.

## Performance budgets (CI via size-limit)

- Content script per store: ≤ 110 KB gz JS (React included), CSS ≤ 12 KB gz.
- Offscreen page: ≤ 15 KB gz.
- Popup: ≤ 150 KB gz JS; first paint ≤ 100 ms.
- Fonts shipped to the overlay: Rethink Sans latin wght (35.7 KB) + Bricolage instance subset (target ≤ 20 KB). Popup/options use the same files.
- Scan of 60 tiles: pill ≤ 1,500 ms p95 after last tile (SPEC AC-F4.1).

## Testing approach

Mapped to SPEC acceptance criteria; the test-engineer stage completes the mapping.

1. **Unit (vitest, Node + happy-dom)**
   - `core/hash`: known-answer tests on synthetic images; Node and browser parity via the shared resample.
   - `core/cluster`: precision/recall harness over fixture `hashes.json` vs `labels.json` (AC-F11.2 thresholds: precision ≥ 0.97, recall ≥ 0.85, per store and overall). Property tests: group letters stable under shuffles; medoid split prevents chaining.
   - `core/text`: pack-count, title sanity, brand normalisation tables (≥ 80 real-world title cases, typed by hand from public listings, no copied images).
   - `adapters/*`: run against every fixture `page.html` in happy-dom (AC-F1.1–F1.2) and against synthetic mutation sequences for lazy loading.
   - `hasher/allowlist`: refuses non-allowlisted URLs; manifest parity.
   - copy lint (AC-X.1) and network grep (AC-X.2).
   - storage items with `wxt/testing` fake browser.
2. **e2e (Playwright, Chromium, built extension via `launchPersistentContext` + `--load-extension`)**
   - Test builds (`FT_E2E=1`) add `http://localhost:4173/*` to content-script matches and host permissions so fixture pages served by a local static server exercise the real hashing path. This flag can never be set in a release build (CI asserts the release manifest).
   - Flows: pill appears; `T` rings; `F` folds and unfolds with exact DOM restore; Proof lens readout on the demo page (identical photos → "100% identical", re-encoded photos → ≥ 99%); session memory across `?page=2`; popup counts; reduced-motion run; axe on overlay, popup, options.
3. **Manual smoke** each release: real amazon.com and walmart.com searches in Chrome and Firefox, checklist in `docs/SMOKE.md` (later stage).

## Fixture strategy

- **Why no store images in git:** product photos are the stores' and sellers' copyrighted content. Committing hashes is enough to test clustering; pixel paths are tested on synthetic images.
- **Real pages (`tests/fixtures/<store>/<slug>/`):**
  1. `scripts/capture-fixture.ts "<query>"` (maintainer runs it locally with Playwright) saves the rendered results DOM and downloads thumbnails into `tests/fixtures/_raw/` (gitignored).
  2. `scripts/sanitize-fixture.ts` strips scripts, styles, iframes, tracking params, cookies and personalisation (account names, location, Prime banners), keeps only the elements and attributes the adapter reads (plus enough structure to keep selectors honest), rewrites image URLs to stable placeholders that keep host and path shape, and computes `hashes.json` from the raw thumbnails with the production hash code.
  3. The maintainer labels twin groups and variant families in `labels.json` by viewing the raw thumbnails side by side (a small local labelling page in `scripts/` is acceptable).
  4. `PROVENANCE.md` records query, store, capture date, browser version and sanitiser version.
  - Target corpus: Amazon ≥ 12 pages across ≥ 8 categories (laptop stand, LED strip lights, phone tripod, silicone spatula set, dog poop bags, cable organizer, ring light, acrylic paint set, shower caddy, kitchen scale, USB-C hub, plant pots); Walmart ≥ 6.
- **Synthetic corpus (`tests/fixtures/synthetic/`, committed):** `scripts/gen-synthetic-corpus.ts` renders deterministic product-like images with sharp (seeded shapes, gradients and labels on white), then derives twins (JPEG q 60–95, resize 0.5–2×, ≤ 3% crop, brightness ±5%) and non-twins (different seed, same category silhouette). Labels are generated with the images.
- **Demo page (`tests/fixtures/demo/laptop-stand/`):** a store-like results grid with 60 made-up listings and authored images (rendered stills of a laptop stand model with the studio prerender kit, plus generated distractors). No store logo, name or trade dress beyond the DOM structure the adapter reads. A visible corner label reads "Demo page with made-up listings". Used by e2e, the README GIF and the landing page.
- **Drift policy:** when a store changes its DOM, capture a new fixture, keep the old one (adapters must handle both while both exist in the wild), and bump the adapter's `version`.

## Trade-off analysis

- We accept one extra context (offscreen) and SW-mediated storage in exchange for reliable pixel access without CORS headers. The Firefox build trades the offscreen document for its DOM-capable background page behind the same `Hasher` interface.
- We accept React in the content script (+~58 KB gz) for one component model across surfaces, and offset it by keeping Motion out of the content bundle (signature motion is hand-written WAAPI, which also gives exact interruptibility via `Animation.reverse()`).
- We accept that thumbnail re-reads may be real downloads from the store CDN (cache partitioning) in exchange for not trusting CDN CORS headers. Copy says what is true, and the popup counts it.
- We accept a smaller, hash-only real-page corpus in exchange for a repo that carries no third-party product photos.

## Consequences

- **Easier:** testing clustering offline; replacing a broken adapter without touching UI; adding a store later (one adapter + allowlist entry + fixtures).
- **Harder:** e2e needs the test-only localhost match; overlay fonts depend on page CSP (fallback exists); offscreen messaging adds a hop.
- **Revisit:** if Chrome loosens offscreen limits or the SW path (Option B) proves equally reliable, drop the offscreen document; if CLIP is added later, it gets its own ADR (model download, WebGPU/WASM, opt-in).

## Action items

1. [ ] **Day 1: spike F0** (SPEC AC-F0.1–F0.5). Record the measured cache-hit rate, host list and timings in this ADR (new section "Spike results") and in HANDOFF.md. Stop and report if it fails.
2. [ ] Scaffold WXT + React + Tailwind v4 + tokens from DESIGN.md (`:root, :host` selectors), strict TS, ESLint, Prettier, Vitest, Playwright; pin the versions above.
3. [ ] Implement `src/core` (hash, cluster, text, price, session) with unit tests and the synthetic corpus.
4. [ ] Amazon adapter + 12 fixtures + precision CI; then Walmart adapter + 6 fixtures.
5. [ ] Hasher (Chrome offscreen, Firefox background), allowlist, counters.
6. [ ] Overlay UI, popup, options per DESIGN.md.
7. [ ] Font subsetting script; size-limit budgets; release-manifest assertion (no `FT_E2E` hosts).

## Stage 2 notes: what the scaffold changed or measured (2026-10-27)

**Spike F0, partial.** The hashing path (service worker, offscreen document, `fetch` with `credentials: 'omit'`, `createImageBitmap(blob)`, `OffscreenCanvas`) was run end to end in Playwright with the real built extension in Chromium (Chrome for Testing 156) against synthetic images served from `http://localhost:4173` (`pnpm test:e2e`). Results: the demo page's 60 thumbnails produced the six expected twin groups (so they decoded and hashed; a tainted canvas or CORS failure would have thrown), and the popup's counter showed 60 reads, all from the one host. **Not done:** the same run against real amazon.com and walmart.com pages (AC-F0.1, AC-F0.3 cache-hit rate, AC-F0.5), the p95 timing on 60 real thumbnails (AC-F0.2), and the Firefox background-page path in a real Firefox (AC-F0.4). The `fromCache` figure is `null` (unknown) for cross-origin images that send no `Timing-Allow-Origin`; the popup counts those separately instead of claiming a cache hit. The Decision 3 status therefore stays *Proposed* until a maintainer runs the spike on live pages.

**Deviations from the stage 1 text, all deliberate:**

| Topic | Was | Now | Why |
|---|---|---|---|
| `ImageHashes.color` | `Uint8Array` | 96-character hex string | Hashes cross `runtime` messaging and `storage.session`, which serialise to JSON and would turn a typed array into a plain object. |
| dHash bit | left brighter than right | left brighter than right by more than a dead zone of 4 luma levels | On white backgrounds JPEG noise flipped bits in flat areas. The dead zone cut false misses on the synthetic corpus from 24 to 16 of 300 re-uploads. |
| White-margin trim before hashing | not specified | tried, rejected | A hard threshold made the bounding box jump with a 5% brightness change (62 of 300 re-uploads failed, worse than 16). Not shipped. |
| Overlay styling | Tailwind v4 in the overlay | plain CSS over the token variables in the overlay; Tailwind in popup and options | Tailwind v4 utilities that use `--tw-*` variables rely on `@property`, which Chromium ignores inside shadow roots. |
| Firefox target | MV3 | MV3 via `manifestVersion: 3` in `wxt.config.ts` | WXT builds Firefox as MV2 unless told otherwise. |
| `data_collection_permissions` | not mentioned | `{ required: ['none'] }` under `gecko` | AMO asks new extensions to declare it. web-ext lint then warns that `strict_min_version` 128 predates Firefox 140, which introduced the key; older versions ignore it. |
| Fixture corpus | sanitised captures of real pages | seeded synthetic reconstructions | See `tests/fixtures/README.md`. Real captures still need a maintainer with `scripts/capture-fixture.ts`, which is not written yet. |

**Measured, not assumed:**

- Bundle sizes (gzip, release build): content script 84.2 kB (budget 110), background 10.8 kB (30), offscreen 3.2 kB (15), popup and options JS 80.0 kB (150). `pnpm size` enforces them.
- Bricolage Grotesque instance is 53.2 kB, over the 20 kB target in the performance budget; Rethink Sans is 35.7 kB as planned.
- Clustering 200 listings: about 8 ms standalone (budget 50 ms).
- pHash within 6 for re-uploads (JPEG q 60 to 95, 0.5x to 2x, crop up to 3%, brightness about 5%): 93.75% on 192 synthetic re-uploads (SPEC asks 98%). Different synthetic photos beyond pHash 6: 100% of 1,128 pairs (SPEC asks 99%). The misses are almost all crops of 2% or more.
