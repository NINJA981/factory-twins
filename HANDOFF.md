# HANDOFF: Factory Twins

Last updated: 2026-10-20, end of **Stage 1: Architect**.

## What's done

Documents only. No code, no `package.json`, and nothing to build or run yet.

| File | What it is |
|---|---|
| `SPEC.md` | Problem, users, daily trigger, weakness fix (§4), 12 MVP features with acceptance criteria (AC-F0 to AC-F12, AC-X), matching rules, data model, privacy model and network policy, platform matrix, 10-second demo script, novelty re-check, risks, open questions |
| `docs/adr/0001-architecture.md` | Stack pinned with `npm view` on 2026-10-20, options considered, module layout, runtime architecture (content script → background → offscreen/background hasher), manifest, budgets, testing approach, fixture strategy |
| `DESIGN.md` | Google Stitch DESIGN.md: OKLCH tokens (light and dark), the twin group palette, type scale (T6), spacing, radius, elevation, motion, component specs and state tables for the overlay, popup, options and landing, two signature moments frame by frame, the 3D plan (CSS/SVG plus pre-rendered stills, no WebGL), three "we never" rules, the pre-flight checklist |
| `.impeccable/design.json` | Impeccable sidecar: canonical colours, shadows, motion, breakpoints, five component snippets, narrative |
| `docs/LANDING.md` | Five-beat landing narrative, hero concept, draft copy, README mirror |
| `PRODUCT.md` | Impeccable product record (users, purpose, positioning, constraints). Facts inferred from the brief are marked |
| `.gitignore` | Includes `tests/fixtures/_raw/` so raw captured store pages never get committed |

### Checks run in this stage
- `@google/design.md@0.4.0 lint DESIGN.md`: **0 errors, 0 warnings** (80 colours, 14 type scales, 80 components). The first run found 3 errors and 34 warnings; all were fixed. Note: `npx @google/design.md lint` printed nothing on this machine (even `--help`), so run it as `node node_modules/@google/design.md/dist/index.js lint DESIGN.md` from a local install.
- Contrast and ΔE_OK checks for the twin palette and accent, run with culori 4.0.2 in a scratch script (not in the repo). Results are in DESIGN.md › Colors.
- Novelty re-check: 3 web searches plus 1 page fetch (SPEC §13). New neighbour: Amaslop. It filters brands; it does not group by photo.

## Next stage (Scaffold + Core): do these first

1. **Spike F0 before anything else** (SPEC AC-F0.1–F0.5; ADR action item 1). Prove that thumbnails can be fetched from the image CDN in the offscreen document (and the Firefox background page), decoded through `createImageBitmap(blob)`, and hashed without a tainted canvas. Record the cache-hit rate, the host list and the timings in the ADR and here. **If it fails, stop and report.**
2. Pin exactly the versions in the ADR stack table. **TypeScript is 6.0.3, not the latest 7.0.2**, because `typescript-eslint@8.72.0` has the peer range `typescript >=4.8.4 <6.1.0`.
3. Put the tokens in `src/styles/tokens.css` on `:root, :host`. This matters because Tailwind v4 theme variables must also resolve inside shadow roots. Map them to Tailwind with `@theme inline`. Dark mode goes on `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`.
4. Offscreen documents only get `chrome.runtime`. All storage writes (hash cache, network counter) therefore go through the background (ADR, runtime architecture).

## How to run

Nothing to run yet. The Scaffold stage adds `pnpm dev`, `pnpm build`, `pnpm build:firefox`, `pnpm test`, `pnpm test:e2e`, `pnpm lint` and `pnpm typecheck`.

## Known issues and open decisions

- **Not verified yet:** the whole hashing path (spike F0). It is still possible that Chrome's cache partitioning makes thumbnail re-reads real downloads from the store CDN. The copy is written to stay true either way ("Nothing leaves your device", with counts by host in the popup), but the measured numbers do not exist yet.
- **SPEC Q1:** the pill says "37 products" (picks.json wording). It may read as a claim that the items are the same. The UI stage should test it and may switch to "37 distinct photos".
- **SPEC Q2:** the Walmart image host and item-id attributes are unconfirmed.
- **SPEC Q3:** extension fonts inside the store's page may be blocked by the page CSP. The fallback is the metric-matched system stack (the final overrides are measured in the UI stage).
- **Bible deviations, written into DESIGN.md:**
  - The D4 pop yellow was moved from `oklch(0.86 0.15 92)` to `oklch(0.90 0.10 100)` because it was ΔE 0.024 from Miro's colour.
  - No cmdk palette (5 actions only, all with visible controls and keycaps).
  - The fold animates on a keyboard trigger (the one signature moment; bible P1 exception).
  - The overlay uses WAAPI instead of Motion to keep the content-script bundle small.
- **Impeccable flow:**
  - No interview was possible (unattended subagent). PRODUCT.md is inferred from the brief and labelled as such.
  - The direction roll (`concept-seed`) was not run, because the studio pinned the visual world (D4 + T6 + brand blend), and a pinned direction beats the roll.
  - No landing surface brief or direction contract was written. The landing stage may write one under `.impeccable/` before building.
  - Run `impeccable detect` on UI code once it exists.
- **Fixtures:** store product photos are never committed. Real-page fixtures carry sanitised DOM plus hashes and labels only (ADR, fixture strategy). Capturing them needs a maintainer to run `scripts/capture-fixture.ts` locally against live pages.
- **Demo data:** every price, rating and review count in the demo script and on the landing page belongs to made-up demo listings and is labelled that way. The "How it works" numbers on the landing page are `[measure: …]` placeholders until the spike and build measure them.
