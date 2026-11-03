# HANDOFF: Factory Twins

Last updated: 2026-11-04, release preparation for 0.1.0 (branch `release/linkedin`). The web app and
landing page in `site/` have their own notes in `site/HANDOFF.md`.

## State in one paragraph

The extension, its whole interface (pill, rings, fold cards, Proof lens, cheatsheet, popup, options), the
landing page and the web app are built and tested on synthetic pages. Nothing has run on live amazon.com or
walmart.com, and the Firefox build has not been opened in Firefox. The README's "Limitations" section is
the public version of the open items below.

## What changed in release preparation

| Area | Change | Where |
|---|---|---|
| Client-side navigation (review HIGH 1) | The page URL is read at every scan. A new query in the same tab resets the page state (letters, rings, fold, seen tiles) and rescans; a results list the store replaces in place is watched again. The content script checks on `popstate` and once a second. A scan that finishes after the shopper moved on is dropped. | `src/content/controller.ts` (`checkPage`), `src/content/run.tsx`; tests in `tests/unit/controller.test.ts` |
| False "layout changed" alarm (review MEDIUM) | Store pages under `/s` that are not searches, and searches with no results, now leave the pill idle instead of showing the error pill. | `src/core/state/pill.ts` (`quiet` event), controller; tests in `controller.test.ts`, `state.test.ts` |
| Walmart selectors (review HIGH 2) | Price is read from `itemprop="price"`, then screen-reader text, then the generated class `w_iUH7`, then the whole price block. The file states plainly that the adapter is unverified on live pages. | `src/adapters/walmart/selectors.ts`, `extract.ts`; test in `adapters.fixtures.test.ts` |
| Blank photos (review MEDIUM) | `hashImage` flags a photo whose 32 × 32 luma standard deviation is under 3 (`lowInfo`); such photos never form a twin edge. | `src/core/hash/index.ts`, `src/core/cluster/edges.ts`, `LOW_INFO_LUMA_STD`; tests in `hash.test.ts`, `cluster.test.ts` |
| Prices (review MEDIUM) | "Was", "List", "Typical", "Reg.", "MSRP" and "Compare at" amounts are ignored in any order; `CA$`/`A$` are not read as USD; listings that show a range stay on the ladder but are left out of the brand tax. | `src/core/price/parse.ts`, `brandTax.ts`; tests in `price.test.ts` |
| Pack sizes (review MEDIUM) | All pattern families are read; two different numbers ("100 Count (Pack of 2)") make the pack size uncertain. | `src/core/text/packCount.ts`; tests in `text.test.ts` |
| Proof lens (review MEDIUM) | Pixels that are white in both photos are background and are not counted, so two different products on white no longer read as mostly identical. Two blank photos read 100%. | `src/core/hash/pixelDiff.ts`, `PIXEL_DIFF_BACKGROUND_MIN`; tests in `hash.test.ts` |
| Repository link (review MEDIUM) | `REPO_URL` is `https://github.com/NINJA981/factory-twins` (the maintainer's own account), not a GitHub organisation nobody here owns. The site default matches. The repository does not exist yet. | `src/copy/links.ts`, `site/vite.config.ts` |
| Demo brands | Zexmte, Lumora, Vantix and Oriant (some are real seller names) became Plumbrook, Tessaly, Corvane and Ondrel everywhere: generator, fixtures, site sample, landing demo, tests. ProBrand stays (a generic placeholder). No trademark search was done. | `scripts/gen-fixtures.ts` and the generated files |
| Pill numbers | Examples now use what the demo page really shows: 60 listings, 47 products, 6 twin groups, up to $23 brand tax (SPEC, DESIGN, LANDING, unit tests). The e2e test asserts 47 exactly. | |
| Firefox | `strict_min_version` 140 (the first version that reads `data_collection_permissions`); the web-ext warnings about it are gone. Landing and README say the Firefox build is untested. | `wxt.config.ts` |
| Docs | SPEC, DESIGN, PRODUCT, LANDING and the ADR no longer cite private planning files; the stale `.impeccable/design.json` sidecar and the superseded `docs/screenshots/qa-r1` set are gone. | |
| Packaging | README rewritten; CONTRIBUTING, CODE_OF_CONDUCT (Contributor Covenant 2.1), SECURITY, CHANGELOG; issue templates, PR template and a CI workflow (lint, typecheck, unit tests, both builds, size, zips; site typecheck, tests, build). | `.github/` |
| Launch kit | Store screenshots (1280 × 800), social preview (1280 × 640), zips and `LAUNCH.md` (post draft, alt text, store copy). | `docs/launch/`, `tests/e2e/launch.spec.ts` |
| Tests | Fixture listings are read once per fixture and their happy-dom window closed, which keeps the corpus tests inside a 1 GB heap. | `tests/unit/helpers/fixtures.ts` |

## Verification

All commands ran on 2026-11-04 on the final tree, one at a time through the studio RAM gate, with a
1 GB Node heap, vitest single worker and Playwright `--workers=1`.

| Check | Command | Result |
|---|---|---|
| Lint (eslint + prettier, whole repo including `site/`) | `pnpm lint` | clean |
| Typecheck | `pnpm typecheck`, `pnpm typecheck:site` | clean |
| Unit, extension | `pnpm exec vitest run --maxWorkers=1 --no-file-parallelism` | 491 tests in 18 files pass |
| Unit, site | `pnpm --dir site test` | 12 pass |
| e2e, extension (real Chromium, built extension) | `FT_LAUNCH=1 pnpm test:e2e --workers=1` | 46 pass, 10 skipped (the `FT_SHOTS` screenshot tests; they ran and passed in an earlier run of the same day, which regenerated `docs/screenshots`) |
| Builds | `pnpm build`, `pnpm build:firefox` (each ends in the release-manifest check), site build inside `pnpm test:e2e` (ends in `check-dist`) | pass |
| Bundle budgets | `pnpm size` | content script 106.75 kB of 110, background 10.94 kB, offscreen 3.35 kB, popup and options 137.13 kB of 150 (gzip) |
| Release zips | `pnpm zip`, `pnpm zip:firefox` | `factory-twins-0.1.0-chrome.zip` and `-firefox.zip` (copied to `docs/launch/`), `-sources.zip` in `.output/` |
| Firefox lint | `pnpm lint:firefox` | 0 errors, 7 warnings: 6 are React's own `innerHTML`; 1 says Firefox for Android only reads `data_collection_permissions` from version 142 (the extension is desktop-only) |
| Secrets | `gitleaks detect --no-banner` (history) and `--no-git` (tree) | no leaks |

Timing tests are load-sensitive: on the same tree, two runs under heavy machine load failed the cold-pill
bound (2.97 to 3.11 s against 2.8 s) and the warm popup first paint (152 to 168 ms against 100 ms); the
final run on a quieter machine passed both. Treat AC-F4.1 and AC-F9.4 as met warm on an idle machine only.

The security-scan skill's scanner (AgentShield) audits agent configuration (`.claude/`, MCP servers,
hooks); this repository has none, so it was not run. The manifest was checked by hand and by
`scripts/check-release-manifest.mjs`: permissions `storage` (+ `offscreen` on Chrome), three image hosts,
content scripts on the two search URLs only.

## How to run it

```
pnpm install
pnpm build                # .output/chrome-mv3, then asserts the release manifest
pnpm build:firefox        # .output/firefox-mv3
pnpm zip && pnpm zip:firefox
pnpm lint                 # eslint + prettier --check (whole repo, including site/)
pnpm typecheck
pnpm test                 # vitest
pnpm test:e2e             # builds .output/chrome-mv3-e2e and site/dist, serves the fixtures (:4817) and the site (:4182), runs Playwright
FT_SHOTS=1 pnpm test:e2e screenshots   # review screenshots in docs/screenshots
FT_LAUNCH=1 pnpm test:e2e launch       # launch images in docs/launch
pnpm build:site && pnpm --dir site test && pnpm typecheck:site
pnpm lint:firefox         # web-ext lint on the Firefox build
pnpm fixtures             # regenerate the synthetic fixture corpus (deterministic)
pnpm tokens               # regenerate CSS tokens from DESIGN.md
```

To try it by hand: `pnpm build:e2e`, load `.output/chrome-mv3-e2e` unpacked in `chrome://extensions`,
run `node scripts/serve-fixtures.mjs` and open `http://localhost:4817/s?k=laptop+stand`. The release build
only runs on amazon.com and walmart.com. Playwright needs the full Chromium build (extensions do not load
in the headless shell): `pnpm exec playwright install chromium`.

## SPEC acceptance criteria not met

`docs/TEST_MATRIX.md` maps every criterion to its tests. These are not met, and the README lists them under
Limitations:

| AC | Why |
|---|---|
| F0.1, F0.3 (live part), F0.5 | Never run on live amazon.com or walmart.com: decode rate, cache-hit rate and image hosts are unmeasured. |
| F0.4 | The Firefox background-page path is unit-tested only; Firefox was never opened. |
| F2.2 | pHash keeps 93.75% of re-uploads within 6 bits on the synthetic corpus; the target is 98%. |
| F4.3 (avoid-rect part) | Adapters return `avoid: []` and nothing reads it, so the pill never moves for a store widget. |
| F9.4, F4.1 (cold) | Met warm; the very first popup open takes 190 to 290 ms and the first pill after a cold start can pass 1.5 s. |
| F11.1 | The 18 fixtures are synthetic; there are no capture or sanitise scripts for real pages. |

## Known issues and open decisions

1. **Live pages (most important).** Run the extension on live Amazon and Walmart searches in Chrome and
   Firefox before any store submission: check that tiles are read, the image hosts in
   `src/hasher/allowlist.ts` are right (and do not redirect: the fetch uses `redirect: 'error'`), and the
   rings land on the right tiles. If Walmart fails, ship Amazon only.
2. **Accuracy on real photos is unmeasured.** Thresholds (`src/core/constants.ts`) were tuned on a synthetic
   corpus whose generator was adjusted alongside them. An offline evaluation on licensed product photos was
   attempted outside this repository; it crashed on a missing file and was not re-run, so no accuracy figure
   is published anywhere. Measure precision and recall on a few hundred hand-labelled real pairs before
   claiming one.
3. **Lazy and re-rendered tiles (review MEDIUM, not fixed).** A tile id is marked seen before its photo is
   read, so a tile that first appears with a placeholder image is skipped until the next rescan; a known
   tile the store re-renders into a new element keeps a stale element in `tilesById`, so its ring or rung can
   vanish. Fix: mark ids seen only after `readPage` produced a listing, and re-query tiles by id on each
   overlay sync.
4. **Walmart client-side entry.** The content script only loads on `/search` URLs, so a Walmart search
   reached from another Walmart page without a reload is not picked up until the page reloads.
5. **Rescan cost (review LOW).** Each lazy-tile rescan re-requests every URL on the page, and each 12-URL
   batch reads and rewrites the whole hash cache in `storage.session` (cache hits are not written back, so
   the LRU behaves as FIFO). Wasteful, not a hang.
6. **`storage.session` 10 MB cap.** 50 queries at 200 KB plus a 5,000-entry hash cache can reach it in
   theory; a quota error ends in the error pill.
7. **Pill wording (SPEC Q1).** "47 products" is the shipped wording; "47 distinct photos" is the more
   literal alternative (one place: `src/copy/strings.ts`). Owner's call.
8. **Fonts on the store page (SPEC Q3).** Installed from `web_accessible_resources`; whether a store's CSP
   blocks them is untested. Bricolage subset is 53.2 kB against a 20 kB target (not on the critical path).
9. **Amazon title heuristics (review LOW).** The title is the longest heading and the byline the shortest;
   a long badge heading could be read as the title.
10. **Dependency drift.** Exact pins from 2026-10-20; newer patch releases exist (`wxt`, `vite`,
    `happy-dom`, `typescript-eslint`, `size-limit`, `motion`, `lucide-react`).
11. **Unused-code tools.** knip and depcheck are not installed in this repository, so no automated
    dead-code scan ran; a manual pass found no stray `console` calls, no TODO or FIXME markers and no
    commented-out code in `src/`, `entrypoints/` or `site/src/`.
12. **Test servers.** The site e2e uses `serve-dist.mjs` on :4180 and the root parity test on :4182, with
    `reuseExistingServer`; a stale server on either port makes the tests read old files.

## For the maintainer (decisions outside the code)

- Create `github.com/NINJA981/factory-twins`, push `release/linkedin`, turn on private vulnerability
  reporting, set description, topics and the social preview (`docs/launch/LAUNCH.md`), and publish release
  `v0.1.0` with the zips from `docs/launch/`.
- History: earlier commits on `main` carry AI attribution trailers and a non-NINJA981 author identity
  (studio sanitizer report). Rewriting that history is a separate decision and was not done here.
- Store submission (Chrome Web Store, addons.mozilla.org) only after item 1 above. The listing copy is in
  `docs/launch/LAUNCH.md`.

## Notes for contributors

- Everything the UI needs is on `controller.getState()` (`src/content/controller.ts`): `pill`, `overlay`,
  `result`, `session`, `tilesById`. `foldCardView` and `badgeViews` in `src/core/view/groupView.ts` build
  the fold card and badge data.
- All user-facing strings go through `src/copy/strings.ts`; `tests/unit/compliance.test.ts` scans it for
  banned phrases.
- The overlay uses plain CSS over token variables (`src/styles/overlay.css`), not Tailwind utilities,
  because Tailwind v4's `@property`-based utilities do not work inside shadow roots. Popup and options use
  Tailwind with the generated `@theme`.
- `pnpm build` ends with `scripts/check-release-manifest.mjs`, which fails if the e2e origin, `<all_urls>`,
  extra permissions or extra matches leak into a release manifest.
