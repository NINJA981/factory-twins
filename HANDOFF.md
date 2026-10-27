# HANDOFF: Factory Twins

Last updated: 2026-10-27, end of **Stage 3a: Product UI** (on top of Stage 2: Scaffold + Core).

## What's done

The extension scaffold, the whole non-UI engine and every product surface: summary pill (all states), rings and badges, fold card with the choreographed fold, Proof lens, shortcut cheatsheet, popup (all states) and options. `pnpm typecheck`, `pnpm test` (471 tests), `pnpm build`, `pnpm build:firefox`, `pnpm size` and `pnpm test:e2e` (25 tests, real Chromium with the real built extension; `FT_SHOTS=1` adds the 10 screenshot tests) all pass. ESLint and Prettier are clean on everything except `site/`, which another agent owns (root `pnpm lint` also walks `site/`, so it reports that folder's problems; lint our code with `pnpm exec eslint src entrypoints tests scripts`).

| Area | Where | State |
|---|---|---|
| Hashing: area-average resample, dHash, pHash (DCT), OKLab colour signature, pixel diff for the Proof lens | `src/core/hash` | Done, tested, pure |
| Clustering: variant collapse, twin edges, union-find, medoid split, stable letters, evidence (brand tax, most established, few-reviews warning) | `src/core/cluster`, `src/core/price` | Done, tested |
| Text: title sanity, pack counts, brand cleaning and guess | `src/core/text` | Done, 51 table-driven tests |
| Session memory (query keys, merge, trim to 200 KB, LRU of 50), settings, network counter, keyboard map, pill and overlay state machines, fold-card and badge view models | `src/core/session`, `settings.ts`, `net.ts`, `keyboard.ts`, `state`, `view` | Done, tested |
| Store adapters: Amazon, Walmart (selectors, extract, query, registry) | `src/adapters` | Done against the fixture corpus; **not verified on live pages** (see known issues) |
| Hasher: allowlist, `fetch` + `createImageBitmap` reader, service, Chrome offscreen lifecycle, in-place hasher for Firefox | `src/hasher` | Done; Chrome path proven in e2e on localhost; **not run on real stores or in real Firefox** |
| Background coordinator (storage, cache, counter, sessions, undo) behind a `KeyValueArea` seam | `src/background`, `src/storage` | Done, tested with memory storage and WXT's fake browser |
| Content controller (scan, lazy tiles, keys, settings, commands) | `src/content` | Done, tested in happy-dom |
| One engine entry for the web app | `src/core/index.ts` | Done; `tests/unit/compliance.test.ts` fails if anything reachable from it touches `chrome.*`, `wxt`, `import.meta.env` or React |
| WXT entrypoints | `entrypoints/` | background, offscreen page, `amazon.content`, `walmart.content`, popup, options |
| **UI** | `src/overlay`, `src/ui`, `src/styles/{overlay,overlay-base,tile,card}.css` | **Done (Stage 3a).** Overlay: `Pill` (scanning, result, no twins, error, session wording), `TileLayer` (ring per tile, badge, hover card, variants chip; hosts live inside each tile and are removed on release), `FoldLayer` + `FoldCard` + `foldMotion.ts` (the frame-by-frame fold, interrupt, unfold, reduced-motion crossfade; every tile it hides or restores is recorded so the grid comes back byte-identical), `ProofLens` (onion skin, Difference, computed readout, pickers, focus trap, focus return), `Cheatsheet`. Pages: `Popup` (ready, scanning with live count, error with Report layout, off, unsupported) and `Options` over `kit.tsx`. The overlay follows the store page's luminance (`pageScheme.ts`); popup and options follow the browser. Motion is Motion in the pages and WAAPI in the overlay |
| Tokens and fonts | `src/styles`, `public/fonts` | DESIGN.md tokens generated into `tokens.css` (`:root, :host`, light and dark) and `theme.css` (Tailwind v4 `@theme inline`); `pnpm tokens` regenerates, a test fails on drift. Fonts self-hosted from Fontsource builds |
| Fixtures and generator | `tests/fixtures`, `scripts/gen-fixtures.ts`, `scripts/lib/synth.ts` | 12 Amazon + 6 Walmart + demo page; see `tests/fixtures/README.md` |
| Tooling | `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`, `playwright.config.ts`, `.size-limit.json`, `scripts/check-release-manifest.mjs` | Done. MIT `LICENSE`, `.gitignore` |

## How to run it

```
pnpm install
pnpm dev                  # Chrome, live reload  (pnpm dev:firefox for Firefox)
pnpm build                # .output/chrome-mv3, then asserts the release manifest
pnpm build:firefox        # .output/firefox-mv3
pnpm lint                 # eslint + prettier --check
pnpm typecheck
pnpm test                 # vitest, about 25 s
pnpm test:e2e             # builds .output/chrome-mv3-e2e, starts the fixture server on :4817, runs Playwright
pnpm size                 # bundle budgets (run after pnpm build)
pnpm lint:firefox         # web-ext lint on the Firefox build
pnpm fixtures             # regenerate the fixture corpus (about 1 minute, deterministic)
pnpm tokens               # regenerate CSS tokens from DESIGN.md
```

To try it by hand: build, load `.output/chrome-mv3-e2e` in `chrome://extensions` (Developer mode), then run `node scripts/serve-fixtures.mjs` and open `http://localhost:4817/s?k=laptop+stand`. The release build only runs on amazon.com and walmart.com.

Playwright uses the full Chromium in `X:\DevCache\ms-playwright` (extensions do not load in the headless shell).

## Stage 3a notes

- **Screenshots** are in `docs/screenshots/` (`FT_SHOTS=1 pnpm test:e2e screenshots`): pill, rings, badge hover, folded page and card, lens (onion, difference), at 375, 768 and 1440 px, light and dark; popup (supported page and empty), options at three widths, error pill, cheatsheet. `docs/screenshots/fold-frames/<scheme>/` holds ten frames of the fold at 0 to 1000 ms, taken by pausing every WAAPI animation (including those in shadow roots) and stepping the clock. They show the real built extension on the made-up demo page; the page behind the overlay is a synthetic store look-alike (`scripts/fixture-store.css`), not Amazon.
- **Pill accessible name (the Stage 2 conflict) is resolved.** The body button carries `aria-label` "60 listings, 47 products, 6 twin groups, up to $23 brand tax" (`pillAccessibleName`): the visible words in order, commas added, arrow and dividers drawn. It contains the visible label, so axe's `label-content-name-mismatch` passes and the e2e check no longer disables it. "$23" is spoken as "23 dollars" by screen readers; AC-F4.1's literal "23 dollars" would fail WCAG 2.5.3 against the visible "$23".
- **Popup states** needed the content script to say more than "ready": `TabSummary` is now a union (`ready | scanning | error | off`) reported by the controller as it passes through each state (progress throttled to 5 per second). The popup polls every 400 ms only while scanning.
- Handled keys now also `preventDefault` (run.tsx), so a focused lens slider does not take the arrow key twice.
- The repository URL is written once, in `src/copy/links.ts` (`REPO_URL`), still the placeholder. Report layout, Options and the popup all follow it.
- **Zero layout shift:** nothing we render moves a store element (grid snapshot test). The pill itself grows when "Checking photos" becomes the result; the layout-shift API counts that as 0.004 (limit 0.05, test threshold 0.01).
- **Not built, on purpose:** a toast on the store page (DESIGN.md lists one; nothing on the page needs it yet, the Undo toast lives in the popup and options), edge fades on the horizontally scrolling ladder at 375 px, a command palette (written deviation in DESIGN.md).
- **Not done:** `.impeccable/design.json` is still older than DESIGN.md; no Lighthouse run (an extension has no page to audit; axe runs on the popup, options, pill, tiles, fold cards and lens); Firefox was not opened (the Firefox build passes `web-ext lint` and the release-manifest check only).
- **Rubric (DESIGN_BIBLE section 9), my own scoring, not an independent critic:** about 9 on identity, typography, colour, hierarchy, component craft, states and responsive fit; about 8.5 on system states (no store-page toast) and motion (frames checked, but only on the synthetic page and a fast machine). Known visual weakness: with two or three rungs the ladder sits at the left of a very wide card, leaving empty space at 1440 px.

## Numbers measured in this stage

- Bundles, gzip (Stage 3a): content script 105.7 kB (budget 110, the UI added about 21 kB), background 10.8 kB, offscreen 3.2 kB, popup and options 136.9 kB (budget 150; Motion and Radix).
- Clustering 200 listings: about 8 ms (budget 50).
- Fixture corpus, pairwise: Amazon precision 1.0000, recall 0.9846 (2 missed pairs of 130); Walmart 1.0000 and 1.0000. **These describe a synthetic corpus whose generator I adjusted while building it. They are a regression guard, not evidence about real photos.**
- pHash within 6 for re-uploads: 93.75% (SPEC AC-F2.2 asks 98%). Different photos beyond 6: 100% (asks 99%). The unit test floors are 92% and 99%.
- e2e on the demo page: 60 thumbnails read in the real offscreen path, six twin groups found, popup counter shows 60 reads all from `localhost:4817`.
- `web-ext lint` on the Firefox build: 0 errors, 8 warnings (6 are React's own `innerHTML`, 2 say `strict_min_version` 128 predates `data_collection_permissions`, which Firefox 140 introduced).

## Known issues and open decisions

1. **The spike (SPEC F0) is only half done.** The hashing path works in real Chromium against localhost. It has not been run against real amazon.com or walmart.com (cache-hit rate AC-F0.3, host list, AC-F0.1 and AC-F0.5), not timed on real thumbnails (AC-F0.2), and not run in real Firefox (AC-F0.4). The host allowlist (`m.media-amazon.com`, `images-na.ssl-images-amazon.com`, `i5.walmartimages.com`) is still the stage 1 guess. A maintainer must run this on live pages before anything ships. If it fails, the ADR fallback applies.
2. **Selectors are unverified against live markup.** `src/adapters/*/selectors.ts` were written from the public page structure. The fixtures were generated to match them, so passing fixture tests proves the code is internally consistent, not that Amazon or Walmart still render this way. SPEC Q2 (Walmart item id and image host) is open. `scripts/capture-fixture.ts` and `sanitize-fixture.ts` from the ADR are **not written**; AC-F11.1 (sanitised real pages) is therefore not met, only its synthetic stand-in.
3. **AC-F2.2 pHash robustness is below spec** (93.75% against 98%), mostly 2% to 3% crops. Options for the next owner: compare against a second hash of a slightly zoomed copy, or relax the crop claim in the SPEC. A white-margin trim was tried and made it worse (ADR, stage 2 notes).
4. **(Resolved in Stage 3a, see notes.) Accessible name vs visible text on the pill.** AC-F4.1 fixes the spoken name ("60 listings, 37 products, ..."), but the visible text has an arrow and dividers, so axe's `label-content-name-mismatch` (WCAG 2.5.3) fires. The e2e axe check disables that one rule with a comment. The UI stage must choose: change the AC's wording or change the visible text.
5. **`chrome.storage.session` is capped at 10 MB.** Up to 50 queries at 200 KB plus a 5,000-entry hash cache can reach it in theory. Nothing handles a quota error beyond the content script showing the error pill. Worth a cap on total bytes if real use gets near it.
6. **Report layout link** points at `https://github.com/factory-twins/factory-twins/issues/new`, a placeholder. Set the real repository URL in `src/copy/links.ts` (`REPO_URL`) once it exists. The link carries the store and adapter version only.
7. **Dependency drift since the 2026-10-20 pins** (all kept exact): patch releases of `wxt` 0.21.5, `vite` 8.3.5, `happy-dom` 21.0.4, `typescript-eslint` 8.72.1, `size-limit` 14.3.0; `motion` 14.7.1, `lucide-react` 1.62.0; deliberate holds: `typescript` 6.0.3 (typescript-eslint peer range), `@types/node` 24 (Node 24 toolchain). `motion` (popup, options) and `lucide-react` (popup, options) are used by the pages; the overlay draws its own icons and uses WAAPI.
8. **Pill wording (SPEC Q1)** "products" is unchanged. The summary counts derive from variant collapse and twin groups, so the UI stage can switch to "distinct photos" in one place (`src/copy/strings.ts`).
9. **Bricolage subset is 53.2 kB** against a 20 kB target in the ADR budget. It only loads in popup, options and the fold card and Proof lens, so it is not on the critical path; the UI stage can narrow the glyph set.
10. **Fonts on the store page (SPEC Q3)** are installed by `src/overlay/fonts.ts` into the page head from `web_accessible_resources`. Whether a store's CSP blocks them is untested; the fallback families are in `src/styles/fonts.css` with unmeasured size overrides.
11. **Stage 1 sidecar is stale.** `.impeccable/design.json` is older than `DESIGN.md` (an Impeccable hook reported this). Re-run `/impeccable document` in the UI stage.
12. **Still not built:** `docs/SMOKE.md` and the `site/` package (another agent). The Firefox build is proven by `web-ext lint` and the unit tests of the in-place hasher path, not by running Firefox.

## Notes for the next stage

- Everything the UI needs is on `controller.getState()` (`src/content/controller.ts`): `pill`, `overlay` (rings, folded, lens, focused letter), `result` (groups, summary, variant families), `session` (listings by id), `tilesById` (the store's tile elements). Dispatch with `controller.dispatch(...)` or `runAction(...)`. `foldCardView` and `badgeViews` in `src/core/view/groupView.ts` already build the fold card and badge data, including per-unit prices, "page 2" chips and the few-reviews warning.
- All user-facing strings go through `src/copy/strings.ts`; `tests/unit/compliance.test.ts` scans it for banned phrases and checks the SPEC wording.
- The overlay uses plain CSS over the token variables (`src/styles/overlay.css`), not Tailwind utilities, because Tailwind v4's `@property`-based utilities do not work inside shadow roots. Popup and options use Tailwind with the generated `@theme`.
- Use `pnpm fixtures` after changing `scripts/lib/fixture*.ts` or `synth.ts`; the demo seed is chosen automatically so the page shows exactly its labelled groups with a safety margin.
- The e2e build is `--mode e2e` and adds `http://localhost:4817` to content-script matches and host permissions. `pnpm build` ends with `scripts/check-release-manifest.mjs`, which fails if that origin, `<all_urls>`, extra permissions or extra matches leak into a release manifest.
