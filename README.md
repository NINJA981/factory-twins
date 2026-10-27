# Factory Twins

A browser extension for Amazon.com and Walmart.com search pages. It rings every listing that uses the same factory photo, then folds each group into one card with a price ladder. A Proof lens overlays the photos so you can check the match by eye. It runs on your device: no account, no servers.

It compares photos, not products. A group can mix an original with a listing that borrowed its picture, so the extension shows the evidence (photos, prices, ratings, review counts) and leaves the verdict to you.

Desktop browsers only (Chrome and Edge, Brave, Firefox 128 or newer). Amazon.com and Walmart.com search results.

Status: scaffold and engine are done and tested; the visual interface is a placeholder. See [HANDOFF.md](HANDOFF.md).

## Run it

Needs Node 24 and pnpm.

```
pnpm install
pnpm dev            # Chrome with live reload
pnpm dev:firefox    # Firefox
pnpm build          # .output/chrome-mv3
pnpm build:firefox  # .output/firefox-mv3
```

Load `.output/chrome-mv3` as an unpacked extension in `chrome://extensions` (Developer mode) to try a build.

## Check it

```
pnpm lint
pnpm typecheck
pnpm test           # unit tests (vitest)
pnpm test:e2e       # builds the test-only extension and drives Chromium with Playwright
pnpm size           # bundle budgets, after pnpm build
```

## How it is built

- `src/core` and the modules it re-exports are pure TypeScript with no browser-extension APIs. `src/core/index.ts` is the single entry that both the extension and a web app import.
- `src/adapters` has one isolated module per store. A layout change on one store touches one folder.
- `src/hasher` reads the thumbnails the page already shows, from the store's own image server only, and turns them into perceptual hashes in an offscreen document (Chrome) or the background page (Firefox).
- `entrypoints` holds the thin WXT wiring: background, offscreen page, two content scripts, popup and options.
- [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md) has the decisions, [SPEC.md](SPEC.md) the product, [DESIGN.md](DESIGN.md) the visual system.

## Privacy

Nothing leaves your device. The extension has no server and no analytics. The only requests it makes are re-reads of product thumbnails from the store's own image server, with no cookies and no referrer. The popup shows how many of those it made this session and from which host.

## Licence

MIT. See [LICENSE](LICENSE).
