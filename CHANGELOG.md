# Changelog

All notable changes to this project are written down here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-04

First public version. Tested on synthetic store pages only; see the README's Limitations.

### Added

- Summary pill on Amazon.com and Walmart.com search pages: listings, distinct photos ("products"), twin
  groups and the largest brand tax, with scanning, no-twins, error and session wordings.
- Rings, letter badges and ring patterns for every twin group (`T`), so groups never depend on colour alone.
- Fold cards (`F`): each group folds into one card with a price ladder, ratings and review counts under
  every rung, a "most established" marker, a few-reviews warning and a brand-tax bracket. Unfolding
  restores the store grid exactly.
- Proof lens (`P`): onion skin and Difference views with a computed share of matching pixels.
- Popup (this page's counts, per-store switch, image reads by host) and Options (stores, auto rings,
  single-key shortcuts, strictness, session memory, clear session with Undo).
- Session memory: pages 2 and 3 of a search join the groups found on page 1, for the browser session only.
- Landing page and an in-browser web app (`site/`) that runs the same engine on photos you pick.
- Chrome MV3 build (offscreen hashing) and a Firefox MV3 build (background-page hashing, untested in Firefox).

### Changed during release preparation

- A new search inside the same tab (client-side routing) now starts a fresh page state instead of merging
  into the previous search, and a replaced results list is watched again.
- Store pages that are not search results, and searches with no results, no longer show the "layout
  changed" error pill.
- Blank or flat placeholder photos are flagged when hashed and never form a twin group.
- Brand tax leaves out listings that show a price range, and prices ignore "Was", "List" and "Typical"
  reference prices and other dollar currencies (CA$, A$).
- A title that names two different pack sizes ("100 Count (Pack of 2)") is treated as uncertain.
- The Proof lens leaves out white background that both photos share, so two different products on white
  no longer read as mostly identical.
- The Walmart price is read from semantic markup first and from a generated class name last.
- The Firefox build requires Firefox 140, the first version that reads `data_collection_permissions`.
- Demo brand names replaced with invented ones.

[0.1.0]: https://github.com/NINJA981/factory-twins/releases/tag/v0.1.0
