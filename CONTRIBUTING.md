# Contributing to Factory Twins

Thanks for helping. Factory Twins is small on purpose: a pure engine, one adapter per store, and a thin
browser-extension shell. Most changes touch one of those three and nothing else.

## The most useful help right now

1. **Run it on a live search page and tell us what happened.** The extension has only been tested on
   synthetic pages. Open an issue with the "Bug report" template: store, query, what the pill said, and
   whether the rings landed on the right tiles. Do not paste page HTML or screenshots that show other
   people's names or addresses.
2. **Check the store selectors.** `src/adapters/amazon/selectors.ts` and `src/adapters/walmart/selectors.ts`
   were written from the public page structure. If a store renders differently, a fix is one file plus a
   fixture.
3. **Try the Firefox build.** It passes `web-ext lint` but nobody has run it in Firefox yet.

## Set up

You need Node 24 and pnpm 10.

```
git clone https://github.com/NINJA981/factory-twins.git
cd factory-twins
pnpm install
pnpm build              # Chrome build in .output/chrome-mv3
pnpm build:firefox      # Firefox build in .output/firefox-mv3
```

Load the build as described in the README ("Install"). For a page to try it on without visiting a store,
build the test variant and serve the made-up demo store:

```
pnpm build:e2e                    # .output/chrome-mv3-e2e, also runs on localhost:4817
node scripts/serve-fixtures.mjs   # then open http://localhost:4817/s?k=laptop+stand
```

## Before you open a pull request

```
pnpm lint          # eslint and prettier --check
pnpm typecheck
pnpm test          # unit tests (vitest)
pnpm test:e2e      # optional locally: builds the e2e extension and drives Chromium with Playwright
```

CI runs lint, typecheck, unit tests and both builds on every pull request.

## Where things live

| Path | What it is | Rule |
|---|---|---|
| `src/core` | Hashing, clustering, prices, text, state machines | Pure TypeScript. No `chrome.*`, no `wxt`, no React. A test fails if it imports one. |
| `src/adapters/<store>` | Selectors and tile reading for one store | A layout change touches one folder. Add a fixture with every change. |
| `src/hasher` | Reads thumbnails from the store's image server and hashes them | Only allowlisted hosts, no cookies, no referrer. |
| `src/background`, `src/content`, `entrypoints` | Extension wiring | Keep logic out of here; put it in `src/core`. |
| `src/overlay`, `src/ui` | The pill, rings, fold card, Proof lens, popup and options | Copy comes from `src/copy/strings.ts`. |
| `site/` | Landing page and the in-browser web app | Imports the same engine through the `@engine` alias. |
| `tests/fixtures` | Synthetic store pages and photos | Never commit a real store page or a real product photo. |

## Rules that are tested

- **Honest copy.** The extension compares photos, not products. It never says "same item", "fake" or
  "scam". `tests/unit/compliance.test.ts` scans the copy for banned phrases.
- **No user data in logs.** Diagnostics go through `src/util/log.ts`, which accepts numbers only.
- **No new network destinations.** The only requests are thumbnail re-reads from the store's own image
  server. `scripts/check-release-manifest.mjs` fails a release build with extra permissions or hosts.
- **Thresholds need evidence.** Matching thresholds live in `src/core/constants.ts`. Change them only with
  a measurement, and say in the pull request how you measured.

## Commit messages

Short imperative subject, for example `fix(walmart): read the price from the screen-reader text`. One
logical change per commit.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Report security problems privately,
as described in [SECURITY.md](SECURITY.md).
