## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## How I checked it

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build` and `pnpm build:firefox`
- [ ] `pnpm test:e2e` (if the overlay, popup, options or hasher changed)

## Checklist

- [ ] No new network destination and no new manifest permission (or the README privacy section says why).
- [ ] Copy compares photos, not products (no "same item", "fake" or "scam").
- [ ] A store layout change comes with a fixture under `tests/fixtures/`, and no real store page or photo is committed.
- [ ] Matching thresholds changed? Then the pull request says how they were measured.
