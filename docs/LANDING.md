# Landing page: narrative, hero and draft copy

Package: `site/` (built in the landing stage). Visual system: `DESIGN.md` (Landing page components; 3D plan). Structure: the five-beat narrative from `_studio/3D_INSPIRATION.md` §3.1, in ≤ 7 viewports at 1440 × 900. Visitor mode: Persuade. The visitor should leave knowing three things: listings on a search page often share one photo, this extension shows which ones and what the name costs, and it does that on their own machine.

**Truth rules for this page**
- Every product, price, rating and review count on the page belongs to **made-up demo listings**, and the page says so where they appear ("Demo listings, made up for this page"). No store logo, store name styling or store trade dress appears in the demo.
- No install counts, star counts, testimonials, savings totals or percentages we have not measured. Numbers in "How it works" come from the spike and build measurements; until measured they stay as `[measure: …]` placeholders and the landing stage must fill or cut them.
- Copy claims "same photo", never "same item".
- No analytics on the page, and the footer says so.

---

## Beat 1. Hook (viewport 1)

**Concept: the contact sheet, live.** Left five columns: the H1, one lead sentence, the install actions. Right seven columns: a working 4 × 3 store-like grid of demo listings with the real overlay running on it. Within a second of load the summary pill sits in the grid's corner; five tiles share the same laptop-stand photo under five made-up brands. A single hand-drawn marker circle (the motif) draws around those five after the H1 paints. The visitor can press `F` (or the "Fold twins" button under the grid) and watch the signature fold happen on the page itself.

- **H1 (Display hero, Bricolage 700 wdth 85):** Five brands. One photo.
- **Lead:** Factory Twins circles the listings on your Amazon or Walmart search that use the same product photo, then folds them into one price ladder so you can see what the name on the box costs.
- **Primary:** Add to Chrome · **Secondary:** Get it for Firefox
- **Caption:** For desktop Chrome and Firefox, on Amazon.com and Walmart.com search pages. No account. Nothing leaves your device.
- **Under the demo grid:** "Demo listings, made up for this page." and the button "Fold twins" with keycap `F`.
- **Poster/LCP:** the H1 (text paints first); the demo grid's images reserve their squares; a poster of the folded state stands in under reduced motion and JS-off.

## Beat 2. The real product in motion (viewport 2, Twin A teal block)

A full-width teal colour block (`twin-a-soft`, ink `twin-a-ink`). Left: a 6-second pre-rendered loop (MP4/WebM with AVIF poster) captured deterministically from the extension running on the e2e demo page: pill → rings → fold → ladder → brand tax tag. Right: copy.

- **Heading (Display):** Same photo ×5.
- **Body:** Search for "laptop stand" and page 1 can show the same factory photo again and again under names you've never heard of. Factory Twins hashes every thumbnail on the page and rings the ones that match in a shared colour. Press F and each group folds into one card: every price, rating and review count lined up under the same photo.
- **Caption:** It compares photos, not products. A group can hold the original and a copy that borrowed its picture, so the reviews sit right under each price.

## Beat 3. Three proof moments (viewports 3–5, one per viewport)

### 3a. Brand tax (Twin B amber block)
Static, large crop of a fold card from the demo: ladder $11.99 · $13.49 · $15.99 · $19.99 · $34.99 "ProBrand" with the tag "Brand tax +$23.00", the bracket between Lowest and Highest, and "Most established" under the $11.99 rung (demo data, labelled).

- **Heading (Display):** See what the name costs.
- **Body:** The fold card puts the cheapest and the priciest listing with the same photo side by side and shows the gap as a brand tax. Multi-packs are compared per unit, so a 3-pack never looks like a markup.
- **Small print:** The listing with the most reviews is marked "Most established". A listing with almost no reviews that borrows a well-reviewed photo gets a note saying so.

### 3b. Check the pixels (Twin C lake block, the one "3D" moment)
CSS perspective stack (T21, CSS version) of the five twin photos fanned in space. On scroll into view (once) or on the "Stack them" button, the cards slide together; the top one switches to difference blending and the stack goes black. The readout counts in: "Photos 100% identical" for this demo pair (the demo uses literally the same file; we say that in the caption). A second button, "Try two different photos", stacks a twin and a distractor so the visitor sees what a non-match looks like ("63.8% identical" or whatever the real computation returns at build time; never typed by hand).

- **Heading (Display):** Don't take our word for it.
- **Body:** Open the Proof lens on any group. Slide one photo over the other, or switch to Difference: where the pixels match, the frame turns black. The number underneath is measured, not guessed.
- **Caption:** Demo photos are rendered for this page. On a real store page, the lens uses the store's own thumbnails.
- **Reduced motion:** a static before/after pair and the readout, with a "Stack them" button that crossfades.

### 3c. Every search, every page (Blush Paper, no block)
Quiet beat after two loud ones. A close crop of the summary pill on a results page, and below it the session version of the pill after visiting page 2.

- **Heading (Headline):** Useful even when you don't click.
- **Body:** After every search a small pill says what the page really holds: listings, distinct products, twin groups, and the biggest brand tax on the page. Go to page 2 and it remembers page 1, so a photo that shows up nine times across three pages is counted once.
- **Pill crop text (demo):** 60 listings → 37 products | 6 twin groups | up to $23 brand tax (dividers drawn, not typed).

## Beat 4. The how (viewport 6)

Inline SVG diagram, text in DOM: a box "Your browser" containing "Store search page" and "Factory Twins"; an arrow from Factory Twins to "Store image server" labelled "re-reads the thumbnails already on the page"; a struck-through box "Factory Twins server" labelled "doesn't exist".

- **Heading (Headline):** Nothing leaves your device.
- **How it works, in the studio's five steps (3D_INSPIRATION §3.7), one number per step:**
  1. **The decision.** Compare the photos the page already shows, on your machine, and claim only what the pixels prove.
  2. **The naive version.** Drawing store thumbnails onto a canvas from the page fails: the browser blocks reading pixels from another site's images ([measure: share of tiles that fail with a tainted canvas in the spike]).
  3. **The trick.** The extension re-reads each thumbnail from the store's own image server inside an extension page that has permission for that one host, then hashes it locally: a 64-bit difference hash, a 64-bit DCT hash and a small colour signature ([measure: p95 ms to hash 60 thumbnails]).
  4. **How it degrades.** If a store changes its page layout, the pill says it couldn't read the listings and offers a one-click layout report; nothing else breaks. Reduced motion turns the fold into a crossfade.
  5. **Stack and licence.** WXT, TypeScript, React; MIT licence; no backend, no analytics, no account.
- **Privacy line:** The popup counts every image read by host, so you can check that each one went to the store you were already on.

## Beat 5. Install (viewport 7)

- **Heading (Headline):** Try it on your next search.
- **Install island (ink background, copy button):** until store listings exist, the load-unpacked steps: `pnpm install && pnpm build`, then Chrome → `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`. Firefox: `pnpm build:firefox`, then `about:debugging` → Load Temporary Add-on.
- **Platforms row:** Chrome and Chromium browsers (desktop), Firefox 128+ (desktop). Not available for phones or the store apps.
- **Source:** a link to the GitHub repo. A stars badge only if it is the live shields.io badge for the real repo; never a typed number.
- **Footer:** MIT licence, source, "No analytics on this page.", "Not affiliated with Amazon or Walmart."

---

## README mirror (same beats in text)

1. One line: "Rings the listings on your Amazon or Walmart search that use the same product photo, folds them into one price ladder, and lets you check the pixels. On your machine."
2. Hero GIF (≤ 3 MB, 800–960 px, ≤ 6 s) of the fold on the demo page, deterministic capture.
3. Why, in three bullets: page 1 repeats the same photo under made-up brands; the price gap is the brand tax; nobody shows you this on the page.
4. How it feels: two short loops (rings + fold; Proof lens cancel to black).
5. Install (load unpacked; store links when they exist).
6. How it works: the five steps above, with measured numbers.
7. Privacy, credits, licence.

## Hero concept notes for the landing stage

- The hero is the product working, not a picture of it (3P2; DESIGN.md 3D plan). No WebGL, no canvas.
- Demo product stills: one laptop-stand "factory photo" rendered with `_studio/inspo/3d/prerender-kit` (Lightformer studio light, white sweep like a marketplace photo), reused for the five twins; 7 distractor products rendered or authored the same way. AVIF ≤ 40 KB each.
- Demo brand names are invented and checked against a quick trademark search before launch. "ProBrand" comes from the council's scenario.
- Colour blocks follow The Marker Belongs to the Shopper Rule: the blocks are twin tints because each block is telling the story of a twin group. Berry Ink appears only on the primary buttons, focus rings and the wordmark glyph.
- One marker circle per page in the hero. It does not reappear as decoration elsewhere.
- Meet bible §11.3: initial JS ≤ 120 KB gz, CLS 0, LCP is the H1, no loader.
