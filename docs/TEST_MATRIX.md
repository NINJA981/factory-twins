# Test matrix: SPEC acceptance criteria to tests

Last updated: 2026-10-27, Stage 4 (test engineer). Every acceptance criterion in `SPEC.md` is listed once. "Unit" is vitest (`tests/unit`) or node:test (`site/tests/*.test.ts`); "e2e" is Playwright against the real built extension (Chromium, `--load-extension`, made-up pages served from `localhost:4817`) or against `site/dist` served by `site/scripts/serve-dist.mjs`.

Status words are literal. **Tested** means an automated test fails if the behaviour breaks. **Partly** says what is left. **Not testable here** means it needs a live store page, real Firefox or a human, and is listed in HANDOFF known issues. **Unmet** means the behaviour is not built.

## How to run everything

```
pnpm lint && pnpm typecheck && pnpm typecheck:site
pnpm test                       # 477 vitest tests
pnpm --dir site test            # 12 node:test tests (engine reuse, tokens, truth)
pnpm build && pnpm build:firefox && pnpm build:site && pnpm size
pnpm test:e2e                   # builds the e2e extension and site/dist, then 45 Playwright tests (10 more screenshot tests run only with FT_SHOTS=1)
pnpm --dir site test:e2e        # 85 Playwright tests: smoke, axe, landing, web app at 375x812 touch and 1440x900
```

## Extension

| AC | What it asks | Level | Where | Status |
|---|---|---|---|---|
| F0.1 | 95% of thumbnails decode on real Amazon pages | none | needs live amazon.com | Not testable here. Local stand-in: `acceptance.spec.ts` "reads exactly the listings thumbnails" (60 of 60 decode through the real offscreen path) |
| F0.2 | Hash 60 thumbnails in 1,500 ms p95 | e2e | `acceptance.spec.ts` "the pill is up within 1.5 s of load" (cold 1.2 s, warm 0.15 s, localhost images) | Partly: local pipeline only, no CDN |
| F0.3 | Cache hits and hosts logged | unit + e2e | `hasher.test.ts` "cache status from resource timing"; `extension.spec.ts` popup counter; `acceptance.spec.ts` server-side request log | Partly: hosts and counting tested, real cache-hit rate needs live pages |
| F0.4 | Firefox background-page path | unit | `hasher.test.ts` (in-place hasher path) | Not testable here: real Firefox not run |
| F0.5 | One Walmart page passes F0.1 | none | needs live walmart.com | Not testable here |
| F1.1 | Adapter extracts >= 98% of tiles, 95% prices | unit | `adapters.fixtures.test.ts` "extracts every product tile", "reads a price wherever the page shows one" (every fixture) | Tested on fixtures; live markup unverified |
| F1.2 | Widgets produce zero listings | unit | `adapters.fixtures.test.ts` same test | Tested on fixtures |
| F1.3 | Late tiles picked up within 500 ms, no re-hash | unit + e2e | `controller.test.ts` "picks up tiles that load later"; `acceptance.spec.ts` "a tile inserted after load" (in-page MutationObserver timing under 500 ms, popup still shows 60 reads) | Tested |
| F1.4 | Walmart meets F1.1 to F1.3 | unit | `adapters.fixtures.test.ts` runs both stores (`describe.each(STORES)`) | Tested on fixtures |
| F1.5 | Match only the two search URLs | unit + e2e | `hasher.test.ts` "matches content scripts on the two search URLs only"; `extension.spec.ts` "does nothing on a URL it does not match"; `acceptance.spec.ts` "commands are declared" | Tested |
| F1.6 | Broken layout becomes the error pill | unit + e2e | `controller.test.ts` "degrades to the error state"; `extension.spec.ts` "degrades to the error state on a changed layout"; `acceptance.spec.ts` "the error pill passes axe and carries no page content" | Tested |
| F2.1 | Pure hashes, same in Node and browser | unit | `hash.test.ts` "is deterministic", "matches pinned known answers"; `parity.spec.ts` (extension and web app agree to the percent) | Tested |
| F2.2 | pHash <= 6 for 98% of re-uploads, different > 6 for 99% | unit | `hash.test.ts` "keeps re-uploads within pHash 6 and different photos beyond it" | Partly: floors are 92% and 99%; measured 93.75% against the 98% target (HANDOFF known issue 3) |
| F2.3 | A photo seen once is not fetched again | unit + e2e | `coordinator.test.ts` "sends misses to the hasher and caches", "asks for a duplicated URL once"; `acceptance.spec.ts` server log has 60 distinct URLs and the late tile adds no read | Tested |
| F2.4 | Non-allowlisted URLs are skipped and counted | unit | `hasher.test.ts` "image host allowlist", "never calls fetch for a URL outside the allowlist" | Tested |
| F3.1 | Edge rule thresholds | unit | `cluster.test.ts` "twin edge rule" | Tested |
| F3.2 | Medoid split | unit | `cluster.test.ts` "splits a long chain" | Tested |
| F3.3 | Variant families never form twin groups | unit | `cluster.test.ts` "collapses variant families", `cluster.corpus.test.ts` "never puts two members of one variant family in the same twin group" | Tested |
| F3.4 | Stable letters | unit + e2e | `cluster.test.ts` "letters"; `controller.test.ts` "joins page 2 to page 1 and numbers groups the same"; `parity.spec.ts` (same letters in both shells) | Tested |
| F3.5 | 200 listings in 50 ms | unit | `cluster.test.ts` "clusters 200 listings in 50 ms or less" | Tested |
| F4.1 | Pill text, timing, spoken name | unit + e2e | `ui.test.tsx` "shows the result with drawn dividers and the spoken name"; `compliance.test.ts` pill wording; `extension.spec.ts` "appears with the counts"; `acceptance.spec.ts` timing | Tested; spoken name says "$23", see HANDOFF |
| F4.2 | All five pill states | unit + e2e + axe | `state.test.ts` "pill state machine"; `ui.test.tsx` "shows scanning, no-twins and error states"; `acceptance.spec.ts` "no shared photos" and error pill with axe; `extension.spec.ts` Amazon off removes the pill | Tested |
| F4.3 | Fixed, shadow root, no layout shift, avoids checkout and cart | e2e | `acceptance.spec.ts` "the pill is fixed in the corner, inside a shadow root"; `extension.spec.ts` "never touches the store grid"; `ui.spec.ts` "nothing we render shifts the page" | Partly. **Unmet: the avoid-rect.** Both adapters return `avoid: []` and nothing reads it, so the pill never moves for a store widget (HANDOFF known issue 13) |
| F4.4 | Dismiss, Esc, per-store switch | unit + e2e | `state.test.ts` "stays dismissed"; `controller.test.ts` "stays dismissed after the shopper hides the pill"; `ui.spec.ts` "Esc on the focused pill hides it"; `extension.spec.ts` "the shopper can hide the pill" | Tested |
| F4.5 | Session wording on page 2 | e2e | `acceptance.spec.ts` "page 2 badges count across pages" ("120 listings across 2 pages"); `extension.spec.ts` "page 2 of the same query joins page 1" | Tested |
| F5.1 | Rings, patterns, badge, never colour alone | unit + e2e | `overlay.test.tsx` "twin styles"; `controller.test.ts` rings from keyboard; `ui.spec.ts` "T rings every twin with a lettered badge" | Tested |
| F5.2 | Contrast 3:1 rings, 4.5:1 badge text | unit | `tokens.test.ts` "contrast of the token pairs" (both themes) | Tested |
| F5.3 | Rings follow their tiles | unit + e2e | `overlay.test.tsx` "tile hosts"; `acceptance.spec.ts` "rings stay on their tiles through scroll and resize" (measured offset does not change) | Tested |
| F5.4 | Hover outlines the group | e2e | `ui.spec.ts` "hovering a badge says what it means and outlines the others" | Tested |
| F5.5 | T again removes rings at once | unit + e2e | `controller.test.ts` "turns rings and fold on and off from the keyboard"; `ui.spec.ts` | Tested |
| F6.1 | Fold card: photo, header, ladder, links | unit + e2e | `overlay.test.tsx` "says what the pixels prove"; `ui.spec.ts` "F folds each group", "rungs link to the listings" | Tested |
| F6.2 | Columns under every rung | unit | `overlay.test.tsx` ladder tests (price, per unit, rating, reviews, brand, Sponsored) | Tested |
| F6.3 | Brand tax tag | unit + e2e | `price.test.ts` "brand tax"; `overlay.test.tsx` "tags the brand tax"; `parity.spec.ts` | Tested |
| F6.4 | Most established | unit + e2e | `cluster.test.ts` "picks the member with the most reviews"; `overlay.test.tsx`; `app.spec.ts` chip in the web app | Tested |
| F6.5 | Few-reviews warning | unit | `cluster.test.ts`, `overlay.test.tsx` "warns about a rung with few reviews" | Tested |
| F6.6 | No banned phrase | unit | `compliance.test.ts` "copy lint" over source and every function output | Tested |
| F6.7 | Unfold restores the grid exactly | unit + e2e | `overlay.test.tsx` "puts the host inside the tile and removes every trace"; `ui.spec.ts` "unfolding restores the grid exactly" | Tested |
| F6.8 | Frame-by-frame, interruptible, reduced motion | e2e | `ui.spec.ts` "pressing F again in the middle of the fold turns it around", "reduced motion: no flying photos" | Partly: interruption and the crossfade are asserted; the choreography itself was checked by eye from `docs/screenshots/fold-frames` |
| F7.1 | Defaults to cheapest and priciest, switchable | unit | `state.test.ts` "opens the lens on the focused group ... cheapest and priciest", lens-pick tests | Tested |
| F7.2 | Onion skin slider and keys | unit + e2e | `core.misc.test.ts` "maps arrows to lens nudges (5% and 25%)"; `ui.spec.ts` "P opens it" | Tested |
| F7.3 | Difference renders black for identical photos | unit + e2e | `hash.test.ts` "reports 100.0% only when zero pixels differ"; `ui.spec.ts` "D cancels to black" | Tested |
| F7.4 | Readout is computed, never rounded up | unit + e2e | `hash.test.ts` pixelDiff group; `compliance.test.ts` readout wording; `parity.spec.ts` lens percentages equal in both shells | Tested |
| F7.5 | Focus trap, Esc, focus return | e2e | `ui.spec.ts` "focus stays inside the dialog and goes back where it came from" | Tested |
| F8.1 | Per-query sessions in storage.session | unit + e2e | `session.test.ts` "query keys", "mergePageScan"; `storage.wxt.test.ts`; `extension.spec.ts` page 2 joins page 1 | Tested |
| F8.2 | "seen N times across M pages", "page 2" rung marks | unit + e2e | `overlay.test.tsx` "marks other pages"; `acceptance.spec.ts` badge tooltip says "across 2 pages" | Tested |
| F8.3 | Clear this session, 6 s Undo, settings toggle | unit + e2e | `coordinator.test.ts` "clears sessions ... with undo"; `ui.test.tsx`; `acceptance.spec.ts` clear, undo, clear again; options toggle turns memory off | Tested. The coordinator keeps the undo for 10 s, the toast for 6 s |
| F8.4 | 50 queries, 200 KB each | unit | `session.test.ts` LRU and `trimSessionToBudget` | Tested |
| F9.1 | Popup on a supported page | unit + e2e + axe | `ui.test.tsx`; `acceptance.spec.ts` "on a store page it shows this page, the switch and the shortcuts" | Tested |
| F9.2 | Popup on another page | unit + e2e | `ui.test.tsx`; `acceptance.spec.ts` "on another page it explains where it works" (both example links) | Tested |
| F9.3 | Counts come from the hasher's counter | unit + e2e | `coordinator.test.ts`, `ui.test.tsx`; `extension.spec.ts` "the popup counts the reads the hasher really made" | Tested |
| F9.4 | First paint <= 100 ms, no network | e2e | `acceptance.spec.ts` "first paint is within 100 ms warm" (median of 3 warm opens; a cold first open takes 190 to 290 ms) | Tested warm; cold misses the 100 ms |
| F10.1 | All settings exist with the right defaults | unit + e2e | `core.misc.test.ts` "defaults match the spec"; `ui.test.tsx` "lists every setting the spec names"; `acceptance.spec.ts` options flows (auto-ring, single keys, pill, strictness, memory) | Tested |
| F10.2 | Persist and apply to open tabs without reload | unit + e2e | `coordinator.test.ts`; `controller.test.ts` "applies new settings without a reload"; `acceptance.spec.ts` "options apply to open tabs without a reload"; `extension.spec.ts` | Tested |
| F11.1 | >= 12 Amazon and >= 6 Walmart sanitised real pages | unit | `adapters.fixtures.test.ts` "has the corpus size", `fixtures.hygiene.test.ts` shape and provenance | Partly. **Unmet for real pages:** the 18 fixtures are synthetic; no capture or sanitise scripts exist (HANDOFF known issue 2) |
| F11.2 | Precision >= 0.97, recall >= 0.85 | unit | `cluster.corpus.test.ts` per store and overall | Tested (synthetic corpus: a regression guard, not evidence about real photos) |
| F11.3 | Adapters run over every page.html | unit | `adapters.fixtures.test.ts` | Tested |
| F11.4 | Synthetic visual corpus end to end | unit + e2e | `hash.test.ts` robustness set; `cluster.corpus.test.ts` "the e2e demo page clusters into exactly its labelled groups"; every e2e test runs on the generated demo page | Tested |
| F11.5 | No store product photo in the repo | unit | `fixtures.hygiene.test.ts` "no store product photo is committed" (no image file, no inline image data, hashes only) | Tested |
| F12.1 | Single keys | unit + e2e | `core.misc.test.ts` "maps T, F and P"; `controller.test.ts` "leaves keys alone while the shopper types"; `ui.spec.ts` | Tested |
| F12.2 | Manifest commands | unit + e2e | `hasher.test.ts` "declares both commands"; `acceptance.spec.ts` reads `chrome.runtime.getManifest()` in the real build | Tested |
| F12.3 | Tab order and visible focus | e2e | `ui.spec.ts` "every pill control has a visible focus ring" | Tested |
| X.1 | Copy lint | unit | `compliance.test.ts` | Tested |
| X.2 | No network except the image allowlist | unit + e2e | `compliance.test.ts` "network policy" (source scan); `acceptance.spec.ts` server-side log: every extension request is a thumbnail, `Sec-Fetch-Site: none`, no duplicates; popup makes none | Tested |
| X.3 | Shadow roots, no innerHTML from page data | unit + e2e | `compliance.test.ts` "overlay safety"; `acceptance.spec.ts` shadow root mode check | Tested |
| X.4 | Theme follows the store page | e2e | `ui.spec.ts` "the overlay follows the store page, not the browser"; `acceptance.spec.ts` dark store page axe | Tested |

### Accessibility (axe-core, no rule disabled)

| Surface | Where |
|---|---|
| Pill: scanning to result | `extension.spec.ts` "the pill passes an automated accessibility check" |
| Pill: no-twins, error | `acceptance.spec.ts` |
| Tiles, badge, fold card, lens | `ui.spec.ts` "the fold card and the lens pass an automated accessibility check" |
| Dark store page: tiles, cards, overlay | `acceptance.spec.ts` "a dark store page" |
| Narrow window where the ladder scrolls sideways | `acceptance.spec.ts` "a narrow window" |
| Cheatsheet | `acceptance.spec.ts` |
| Popup (supported page) and options | `extension.spec.ts`, `acceptance.spec.ts` |

## Web app (`site/`, `/app/`)

| AC | What it asks | Level | Where | Status |
|---|---|---|---|---|
| W.1 | Links to `/app/` from hero, nav, privacy, install | e2e | `smoke.spec.ts` "links to the web app from the nav, the hero, the privacy section and the install section" | Tested |
| W.2 | Privacy line in every state; no request beyond static files | e2e x2 viewports | `app.spec.ts`: every flow (sample, pick, paste, drop, error, offline) records requests and `strays()` must be empty: every request is a GET of a file that exists in `dist/`, no query, no websocket; `smoke.spec.ts` no foreign request on either page | Tested |
| W.3 | Engine imported only through `@engine` | unit | `site/tests/engine.test.ts` "the engine is imported, never re-implemented" | Tested |
| W.4 | Four ways in; 60-photo cap | e2e x2 | `app.spec.ts` "pick, paste and drop" (file picker, Ctrl+V, Paste button, drop, 63 files give 60 and a notice) | Tested |
| W.5 | Sample yields exactly 6 groups through the real adapter | unit + e2e | `site/tests/engine.test.ts` "sample"; `app.spec.ts` "6 twin groups among 60 listings" | Tested |
| W.6 | Re-save groups, different does not; prices give +$23.00 | unit + e2e | `engine.test.ts` "picked photos"; `app.spec.ts` "picking photos ... ladder and the brand tax", "a photo and a re-save of it group" | Tested |
| W.7 | Empty, loading, error, success states | e2e + axe | `app.spec.ts` sample flow (empty, loading line, results), "a file that is not an image gets an explanation"; `a11y.spec.ts` scans each, including a held-open loading state | Tested |
| W.8 | Lens: onion, difference, readout, finger drag | e2e | `app.spec.ts` "lens interaction" (real CDP touch events at 375 px, arrow keys at 1440 px), "unfolding restores the grid and the lens returns focus" | Tested |
| W.9 | No horizontal scroll; 44 px targets | e2e x2 | `app.spec.ts` "layout"; `site.spec.ts` widths 375, 768, 1440 | Tested |
| W.10 | Manifest, service worker, offline | e2e x2 | `app.spec.ts` "after one visit the app, the sample and picking all work with the network off" (manifest, three icons, precache holds the sample and its 60 photos, `setOffline`, no failed request), "the service worker has no network code of its own" | Tested |
| W.11 | Tokens only; scheme and motion | unit + e2e | `site/tests/tokens.test.ts`; `site.spec.ts` reduced motion; `a11y.spec.ts` light and dark | Tested |
| W.12 | Budgets, LCP, CLS, Lighthouse | build + manual | `site/scripts/check-dist.mjs` (JS budget, poster, loop, precache) runs in `pnpm build`; `site.spec.ts` poster and loop sizes | Partly: LCP, CLS and Lighthouse were measured by hand in Stage 3b (`site/scripts/lcp.ts`, `cls.ts`) and not re-run in Stage 4 |
| W.13 | Made up, no logo, no testimonial or counts | unit + e2e | `site/tests/tokens.test.ts`; `smoke.spec.ts` "says the demo is made up" | Tested |

### Site smoke and accessibility

`smoke.spec.ts`: eleven static files have the right type and a body; unknown path is a real 404 and `/app` redirects; every manifest icon is served; both pages load with no console error, failed response or foreign request and have a title, description, language, viewport and one h1; every same-origin link resolves.

`a11y.spec.ts` (axe with wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice tags): the landing page at rest, folded and with the Proof stack open; the web app empty, loading, results, rings, folded, lens in both modes, picked photos and the error state. Each runs at 375x812 touch and 1440x900, in light and dark. One more run with reduced motion.

## Parity: web app and extension

`tests/e2e/parity.spec.ts` loads the same results page in the real extension and in the built web app and compares the pill text, every badge, every fold card (letter, header, brand tax, each rung's id, price and brand) and the Proof lens percentages. Fixture A is the 60-listing demo page byte for byte (the web app's sample requests are answered with the demo files); fixture B is the web app's own bundled sample, which the fixture server also serves in an Amazon-shaped URL. Both must be equal, and the test refuses to pass on two empty snapshots.

## Gaps that remain

1. Real stores and real Firefox (F0.1 to F0.5, live selectors): no automated test can cover them from here.
2. F4.3 avoid-rect: not built.
3. F2.2 pHash robustness and F11.1 real captured fixtures: below spec, listed in HANDOFF.
4. W.12 LCP, CLS and Lighthouse numbers are manual.
5. F6.8 choreography is judged from frames, not asserted.
6. The ten screenshot tests only run with `FT_SHOTS=1`.
