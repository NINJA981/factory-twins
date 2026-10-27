# Fixture: amazon-us / ring-light

| | |
|---|---|
| Query | `ring light` (page 1) |
| Store shape | Amazon.com search results, adapter version 1 selectors |
| Generated | 2026-10-27 by `scripts/gen-fixtures.ts` (seed 4202) |
| Listings | 40 product tiles plus 4 non-product widgets |
| Twin groups | 2 (3, 2 listings) |
| Variant families | 1 |

## What this is

A **synthetic reconstruction**, not a capture of a live page. The DOM follows the structure the
Amazon.com adapter reads (tile container, title, byline, price, rating, review count, sponsored label,
lazy image), surrounded by the clutter that real pages carry (widgets, carousels, strike prices,
unit prices, price ranges, listings without a price). Brand names, titles, prices, ratings and
review counts are invented from seeded templates and are not real listings.

`hashes.json` holds the output of the production hash code (`hashImage`) over seeded synthetic
photos. Listings with the same `photo` share a source image; re-uploads are JPEG-recompressed
(quality 60 to 95), rescaled (0.5x to 2x), border-cropped (up to 3%) and brightness-shifted (about
5%). Image URLs are placeholders that keep the store's host and path shape. **No store photo, logo or
text is in this directory.**

## What it does not prove

It tests the pipeline (adapter, hashing, clustering, evidence) against known labels. It cannot show
that the selectors match today's live Amazon.com markup or how often real result pages contain twins.
A maintainer capture with `scripts/capture-fixture.ts` (not written yet) is still needed for that;
see HANDOFF.md.
