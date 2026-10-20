# Product

<!-- impeccable:product-schema 1 -->

> Provenance: written by the architect stage from `_studio/picks.json` (entry `factory-twins`) and the council transcript `W2-4-1-factory-twins.md`. No interview was possible in this unattended run, so facts marked *(inferred)* come from the brief, not from a confirmed user answer.

## Platform

web

## Stack

Delegated by the studio brief: WXT browser extension (Chrome MV3 first, Firefox build too), React + Tailwind v4 for extension pages. See `docs/adr/0001-architecture.md`.

## Users

People who search Amazon.com or Walmart.com on a desktop browser for generic goods: household, kitchen, tech accessories, pet and craft items (laptop stand, LED strip, phone tripod). They run these searches several times a week and compare listings that look different but often use the same factory photo under made-up brand names. *(inferred: desktop only; most marketplace shopping happens in mobile apps, where an extension cannot run.)*

## Product Purpose

On a marketplace search page, Factory Twins finds listings that use the same product photo, rings each group in a shared colour, and folds a group into one card with a price ladder, so the shopper sees how many distinct photos page 1 really holds and how much the priciest copy charges over the cheapest. Success: the shopper notices the summary pill on an ordinary search, and at least sometimes picks a cheaper listing or the one with more reviews because of it.

## Positioning

It clusters the whole results page the shopper is already looking at, in place, by perceptual hashes of the thumbnails, with no backend. Neighbours work one product at a time in the cloud (Dupely, SameSame, Search by Image), or judge brand names without looking at pixels (Knockoff, Amaslop). Every claim can be checked by eye, because the photos really are the same.

## Operating Context

- Lives on `amazon.com/s` and `walmart.com/search` result pages, inside the store's own layout.
- Passive by default: a small summary pill appears after each search. Rings, folding and the Proof lens are on demand (click or single-key shortcut).
- Session memory spans result pages of the same query (page 1, 2, 3) within the browser session.

## Capabilities and Constraints

- Deterministic perceptual hashing (dHash + pHash + colour signature). No AI in the core. An on-device CLIP "looks identical" tier is a later, opt-in stretch at most.
- Copy claims only what is visibly true: "Same photo ×5", never "same item". A same-photo group can mix an original and a knockoff; the extension shows evidence and does not rule.
- Variation families (same brand, same title stem) are labelled "variants of one listing" and are not twins.
- Network: thumbnails are re-read from the store's own image CDN under host permission; nothing goes to any other server. No account, no telemetry.
- v0.1 scope: Amazon.com search, then Walmart search. Temu and other sites are out of scope.
- Undecided: whether the summary pill says "products" or "distinct photos" (see SPEC.md, open question Q1).

## Brand Commitments

- Name: Factory Twins. Honest, checkable copy is a brand commitment, not a style choice.
- Studio assignment: colour direction D4 Mulberry and type pairing T6 (Bricolage Grotesque + Rethink Sans) from `_studio/DESIGN_BIBLE.md`, fixed so the five studio projects stay distinct.

## Evidence on Hand

- No real users, testimonials, ratings, install counts or measured savings exist yet. None may be invented.
- Demo prices in the council brief ($11.99 · $13.49 · $15.99 · $19.99 · $34.99 "ProBrand") are an illustrative scenario. On any marketing surface they must be labelled as a demo unless they come from a real, dated capture.
- Product photos on the landing page must be authored (rendered) assets, not copied store photos.

## Product Principles

1. Show evidence, never a verdict: rings, photos side by side, reviews under every rung.
2. Value on every search: the passive pill must say something useful even when the shopper never clicks.
3. Nothing leaves the device: the only network reads are the store's own thumbnails.
4. One site adapter per store, isolated, so store DOM churn breaks one module, not the product.

## Accessibility & Inclusion

WCAG 2.2 AA. Twin groups are never distinguished by colour alone (letter badge plus ring pattern). All overlay actions reachable by keyboard; reduced motion honoured.
