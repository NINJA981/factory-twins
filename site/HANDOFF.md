# HANDOFF: `site/` (landing page and web app)

Last updated: 2026-10-27, end of **Stage 3b: web app and landing page**.

This is a separate package (own `package.json`, own lockfile) that builds a static site: the launch landing page at `/` and the in-browser web app at `/app/`. The repo's root `HANDOFF.md` is owned by the extension UI stage, which was editing it at the same time, so this stage kept its notes here. Whoever merges the stages should paste the "Lines for the root HANDOFF.md" section below into it.

## What's done

| Area | Where | State |
|---|---|---|
| Landing page, five beats: hero with the live demo, the real product in motion, three proof moments (brand tax, Proof stack, session pill), how it works with the privacy diagram, install, open-source call to action | `index.html`, `src/landing/` | Done. Copy follows `docs/LANDING.md`. |
| Hero signature moment: the real overlay state machines running on a 12-listing demo grid, marker circle drawn once, `F` folds the five twins into one price ladder | `src/shared/stage.ts`, `src/landing/main.ts` | Done. Static HTML is the folded end state (JS off, reduced motion), the head script boots it unfolded. |
| Recorded loop and poster, social card | `public/landing/loop.mp4` (267 kB), `loop-poster.avif` (39 kB), `og.png` (64 kB) | Done. Recorded from the live demo on the page, 8 s, no sound. `pnpm loop` re-records. |
| Proof stack (the one "3D" moment) | `src/landing/main.ts`, `landing.css` | CSS 3D only. Readouts are measured with the engine's `pixelDiff` at build time (twin pair 95.7% identical, different pair 70.1%), never typed. |
| Web app at `/app/` | `app/index.html`, `src/app/` | Done: pick, drop, paste, bundled sample; rings, fold, price ladder, brand tax, Proof lens (touch-draggable); empty, loading, error and success states. |
| PWA | `public/app/manifest.webmanifest`, `src/app/sw.template.js`, `vite.config.ts` (`ft-sw` plugin) | Manifest plus a build-time precache service worker. No network call beyond static files. |
| Tokens and fonts | `src/styles/base.css` imports `../src/styles/tokens.css` through the `@tokens` alias | Same generated tokens as the extension, light and dark. Fonts self-hosted in `public/fonts/`. |
| Build checks | `scripts/check-dist.mjs` | Fails `pnpm build` on: initial JS over 120 kB gzip, WebGL code, any host other than the allowlist, poster over 80 kB, loop over 1.2 MB, a missing or incomplete service-worker precache, analytics-looking code, placeholder text. |
| Tests | `tests/engine.test.ts` (5, node:test through tsx), `tests/e2e/site.spec.ts` (19, Playwright) | All pass. |

## How to run it

```
cd site
pnpm install
pnpm dev                  # Vite on http://127.0.0.1:4181 (the service worker is off in dev)
pnpm build                # vite build, then scripts/check-dist.mjs
pnpm preview              # dist/ on :4180 (what the e2e suite uses)
pnpm serve                # dist/ on :4182 with gzip, cache headers and real 404s: use this for performance numbers
pnpm typecheck
pnpm test                 # unit tests, about 10 s
pnpm test:e2e             # Playwright against pnpm preview; build first
pnpm assets               # regenerate public/sample, public/landing/t, src/demo/*, icons from ../tests/fixtures (deterministic, about 1 min)
pnpm loop                 # re-record loop.mp4, loop-poster.avif and og.png from `pnpm serve` (needs ffmpeg on PATH)
```

Dev helpers, not part of the build: `scripts/shots.ts` (screenshots at 375, 768, 1440, light and dark), `scripts/slice.ts`, `scripts/montage.ts`, `scripts/overflow.ts` (what sticks out past the viewport), `scripts/lcp.ts` and `scripts/cls.ts` (throttled FCP, LCP and layout shifts).

Settings at build time (environment variables): `FT_REPO_URL` (repository link, default is the same placeholder the extension uses) and `FT_SITE_URL` (absolute site URL with a trailing slash, used for `og:image`; empty by default).

## How the web app uses the engine

- Everything importable from the extension's pure core comes through one Vite alias: `@engine` is `../src/core/index.ts`. `@copy` is `../src/copy/strings.ts` (the shared user-facing strings) and `@tokens` is `../src/styles`. Nothing under `site/src` defines hashing, clustering, brand tax or pixel diff; `tests/engine.test.ts` fails if it does.
- The engine needed **no changes**. It touches no extension API: `src/core/index.ts` is guarded by the root `tests/unit/compliance.test.ts`.
- **The thin adapters live in `site/src`** (the only browser glue):
  - `src/shared/measure.ts`: decodes an image Blob to RGBA (`createImageBitmap`, canvas, white letterbox like a marketplace photo, 1024 px cap), `ingestFile` for picked photos (decode, hash input and a display thumbnail), and `measurePair`, which feeds the engine's `pixelDiff` for the Proof lens.
  - `src/app/main.ts`: a `ScanClient` (the engine's interface for "hash these URLs, merge the session, commit letters") that fetches the bundled sample images from the app's own origin and calls `hashImage`. The sample page is parsed with `DOMParser` (inert: no script runs, no image loads) and read by the real Amazon adapter through `scanDocument`.
  - `src/shared/templates.ts`, `stage.ts`, `fold.ts`, `lens.ts`: plain-DOM renderers of the engine's view models (`foldCardView`, `badgeViews`, `pillReducer`, `overlayReducer`, `resolveKey`). They duplicate the look of the extension's overlay but not its logic. When the extension UI stage settles its components, decide whether to share them (they are framework-free on purpose: the landing page ships about 25 kB of JS).
- Photos mode feeds the engine `Listing`s with the store set to `amazon-us` (the type needs one), an identical title for every photo (so the title sanity check always agrees and only the photo decides) and the optional price and brand the visitor types in.

## Numbers measured in this stage

- Initial JS, gzip: landing 24.8 kB, app 26.0 kB (budget 120). Web app precache: 75 files, 0.78 MB.
- chrome-devtools performance trace, 375 px, 4x CPU slowdown, Fast 4G, cold cache, against `pnpm serve`: **landing LCP 810 ms (the lead paragraph), CLS 0.00; app LCP 1,051 ms, CLS 0.00.** Budget: LCP 2.0 s, CLS 0.
- chrome-devtools Lighthouse (mobile, navigation): Accessibility, Best Practices, SEO and Agentic Browsing all 100 on both pages. This tool does not return a Lighthouse performance score; the trace above is the performance evidence.
- Scripted runs of `scripts/lcp.ts` (Playwright, 4x CPU, 1.6 Mbps, 150 ms RTT) gave landing LCP 0.7 to 1.0 s and showed that the numbers on this machine swing a lot when other work is running (single runs of 2 to 5 s happened before the fixes below and the occasional slow outlier is still possible). Treat one trace as a sample.
- Layout shift: 0.0003 to 0.0006 in some scripted runs (the font swap nudges the hero by 3 to 4 px); zero in the DevTools traces after the fix.
- What moved the numbers: `content-visibility: auto` on every section below the hero (first layout paid for the whole page before, which cost 300 to 470 ms of layout at 4x), landing CSS inlined into the HTML (one round trip fewer), measured `size-adjust` on the fallback fonts (Rethink 104%, Bricolage 94%), and static HTML for the app's icons and button labels (the JS-injected icons shifted the privacy line by 18 px).
- Engine on the sample (real adapter, real hashes): 60 listings, 6 twin groups, 47 products, brand tax up to $23; 421 ms to hash and cluster on the dev machine in the browser.

## Bugs found and fixed while testing (worth knowing)

- Tapping from one price field to the next lost the second field: the first field's `change` rebuilt every tile and destroyed the field being focused. The redraw now waits one tick and focuses the same field by id again; the toolbar buttons keep their children so a tap that straddles a redraw is not lost.
- Offline reload failed on hosts that send `Vary: Origin` (module scripts are fetched in CORS mode and the cached copy had no `Origin`). The service worker now matches with `ignoreVary`.
- The summary pill's accessible name did not contain its visible text (axe `label-content-name-mismatch`, WCAG 2.5.3). The site's pill now takes its name from its visible text (the arrow is decorative, the commas are screen-reader only). The extension's pill has the same open issue (root HANDOFF known issue 4); the engine's `pillAccessibleName` is unchanged.
- The fanned proof stack overflowed the page sideways at 375 px; it is clipped and narrower on phones. The how-it-works diagram's labels overlapped; they are re-laid out, and on phones the diagram scrolls sideways instead of shrinking to 7 px text.

## Known issues and open decisions

1. **The hero loop is a recording of the landing demo, not of the extension.** `docs/LANDING.md` asks for a capture of the extension running on the e2e demo page. The extension's rings, fold and lens were not built when this stage ran (root HANDOFF item 12), so the loop shows the page's own demo, which runs the same engine and state machines. Its caption says "Recorded from the demo on this page". Re-record from the real extension once its UI exists.
1b. **`docs/screenshots/` was not used.** It appeared while this stage ran (written by the extension UI stage at the same moment, untracked, still changing). The frames I looked at were work in progress (a broken editorial image, an unfinished fold card), so the landing and the app show the faithful live reproduction built from the engine's own view models and the repo's tokens instead. Once the UI stage is final, swap in real captures for the "real product" beat if wanted.
2. **No WebGL.** The brief allowed 3D within bible §11.3. The landing concept note says "no WebGL, no canvas" and the design is better for it: the one 3D moment (the Proof stack) is CSS 3D, so there is no GPU tier detection, no 3D chunk and no context to lose. Fallbacks that do exist: reduced motion turns the stack into a before/after pair and a crossfade and the fold into a 150 ms crossfade; JavaScript off shows the folded end state; no GPU is needed. If a WebGL scene is wanted later, it belongs behind the tier rules in §11.4.
3. **Placeholders to set before launch.** `FT_REPO_URL` (default `https://github.com/factory-twins/factory-twins`, the same placeholder as the extension) and `FT_SITE_URL` for `og:image` (social crawlers need an absolute URL; without it the tag is relative and will not resolve). The store badges are plain buttons that point to the install section because the extension is not in either store.
4. **Demo brand names are invented** ("ProBrand" from the council scenario, "Vantix", "Oriant" and the rest). `docs/LANDING.md` asks for a quick trademark search before launch. Not done.
5. **Real-world accuracy is untested.** The photo matching is the engine's, proven on the synthetic fixtures (root HANDOFF: pHash within 6 for re-uploads 93.75%, spec asks 98%). The sample and the test photos are synthetic. Real phone photos of different objects on similar backgrounds have not been tried.
6. **Phones were emulated, not held.** Touch, the 375 px layout and the PWA were tested in Chromium with touch emulation. Not run: real iOS Safari (install to Home Screen, 100vh and dialog behaviour, HEIC decoding), real Android Chrome (install prompt). Chromium on desktop and Firefox cannot decode HEIC; the error state says to export JPEG or PNG.
7. **"Paste an image"** uses `navigator.clipboard.read()` (needs permission and a secure context; Firefox support is partial). Pressing Ctrl or Cmd+V with the page open works everywhere and is the fallback the error text points to.
8. **`/app` needs a trailing slash.** The service worker scope and the relative asset paths assume `/app/`. Most static hosts redirect `/app` to `/app/`; `scripts/serve-dist.mjs` does. All paths are relative (`base: './'`), so the site also works under a sub-path such as `https://user.github.io/factory-twins/`.
9. **The service worker caches by build hash.** A new deploy installs a new cache and `skipWaiting` plus `clients.claim` switch to it at once; an open tab keeps its old JS until reload. There is no "update available" prompt.
10. **Lighthouse "agentic" checks** (`llms.txt`, `ai-catalog.json`) pass here because `public/llms.txt` exists and `ai-catalog.json` is a real 404 on `pnpm serve`. `pnpm preview` answers every unknown path with `index.html`, which makes `robots.txt`-style checks fail there; audit against `pnpm serve`.
11. **`.impeccable/design.json` is stale** (root HANDOFF item 11), so the site was built from `DESIGN.md` directly.
12. **The extension's `size-limit` does not cover `site/`** (`pnpm build` runs `check-dist.mjs` for the site's own budgets). Root `pnpm lint` does cover `site/` since Stage 4; the site has its own typecheck (`pnpm typecheck:site` from the root) and tests, so add them to CI as a separate job.

## Stage 4 (test engineer) changes in `site/`

- New tests: `tests/e2e/app.spec.ts` (the web app at 375x812 touch and at 1440x900), `a11y.spec.ts` (axe on every surface and state), `smoke.spec.ts`, `helpers.ts`, and `tests/tokens.test.ts`. The full map is `docs/TEST_MATRIX.md` in the repo root. `@axe-core/playwright` 4.14.0 is a site dev dependency.
- Bugs fixed in the product: keyboard shortcuts did not work on a full results page (the visibility check needed a quarter of a 3,900 px stage on screen); `aria-pressed` was set on a non-button pill; the Proof lens view had an `aria-label` without a role (now `role="img"`); the sideways-scrolling price ladder was not keyboard-scrollable (now a focusable labelled group); the fold card title was an `h3` under the `h1` (now `h2`). Run `pnpm assets` after touching `src/shared/templates.ts`, because the hero markup is generated from it.
- Fold cards are in the DOM before folding (hidden). Tests and any future code must count the visible ones.

## Lines for the root HANDOFF.md

- Done (Stage 3b): `site/` builds the landing page and the web app at `/app/`. It imports the engine through the `@engine` alias to `src/core/index.ts` and needed no engine change; the browser glue is `site/src/shared/measure.ts` and the sample `ScanClient` in `site/src/app/main.ts`. See `site/HANDOFF.md`.
- Run: `cd site && pnpm install && pnpm build && pnpm test && pnpm test:e2e`.
- Open: the hero loop is a recording of the landing demo until the extension UI exists; set `FT_REPO_URL` and `FT_SITE_URL`; trademark-check the demo brand names.
