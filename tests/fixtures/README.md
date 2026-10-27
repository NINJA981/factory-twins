# Fixtures

Everything here is committed, small and free of third-party images.

| Folder | What it is |
|---|---|
| `amazon/<slug>/`, `walmart/<slug>/` | Store-shaped results pages for the adapter and clustering tests: `page.html`, `hashes.json`, `labels.json`, `PROVENANCE.md`. 12 Amazon pages (12 queries) and 6 Walmart pages (6 queries). |
| `demo/laptop-stand/` | The e2e demo page (60 made-up listings, Twin A carries the price ladder from SPEC section 12), its second page, and its synthetic images in `img/`. Served by `scripts/serve-fixtures.mjs`. |

## Provenance, plainly

These are **synthetic reconstructions, not captures of live store pages.** `pnpm fixtures` (`scripts/gen-fixtures.ts`) regenerates all of them deterministically from seeds:

- The HTML follows the structure the adapters read, plus the clutter real pages carry (widgets, carousels, strike prices, unit prices, price ranges, sponsored labels, tiles with no price). The selectors in `src/adapters/*/selectors.ts` were written from the public page structure, not verified against today's live markup.
- Brand names, titles, prices, ratings and review counts are invented from seeded templates.
- `hashes.json` is the output of the production hash code over seeded synthetic photos (shapes on white). Twin listings are JPEG re-encodes, rescales (0.5x to 2x), crops (up to 3%) and brightness shifts of one source photo.
- Image URLs are placeholders with the store's host and path shape. No store photo, logo or text is in the repo.

## What that means for the numbers

Precision and recall in `tests/unit/cluster.corpus.test.ts` (Amazon 1.0000 and 0.9846, Walmart 1.0000 and 1.0000 on the last run) describe the pipeline on this generator. The generator was adjusted while building it (products got rotation and scale variety after the first version made different products look too alike), so treat the figures as a regression guard, not as evidence about real marketplace photos. How often real result pages contain twins, and how well the hashes separate real products, can only be measured on maintainer captures.

`tests/fixtures/_raw/` is ignored by git: that is where a maintainer's raw captures would go.
