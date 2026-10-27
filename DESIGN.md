---
name: Factory Twins
description: "A contact sheet for shopping search: matching photos circled in shared marker colours, folded into a price ladder, checked under a loupe. Berry ink on blush-neutral paper; Bricolage Grotesque for the moments that matter, Rethink Sans for everything else."
colors:
  # Role tokens, light theme (D4 Mulberry, DESIGN_BIBLE §4.2). Canonical values are OKLCH.
  # primary = accent (Berry Ink); "primary" is the Stitch key, "accent" the CSS role name used in code.
  primary: "oklch(0.48 0.17 355)"
  bg: "oklch(0.985 0.004 345)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.958 0.007 345)"
  surface-3: "oklch(0.935 0.009 345)"
  border: "oklch(0.905 0.01 345)"
  border-strong: "oklch(0.60 0.016 345)"
  text: "oklch(0.23 0.02 345)"
  text-muted: "oklch(0.46 0.02 345)"
  text-subtle: "oklch(0.55 0.018 345)"
  accent: "oklch(0.48 0.17 355)"
  accent-hover: "oklch(0.43 0.16 355)"
  accent-soft: "oklch(0.95 0.025 355)"
  on-accent: "oklch(0.99 0.006 355)"
  ring: "oklch(0.48 0.17 355)"
  scrim: "oklch(0.12 0.01 345 / 0.45)"
  # The white every marketplace photo is shot on. Never themed: a photo mat stays white in dark mode.
  photo-mat: "oklch(1 0 0)"
  # Role tokens, dark theme
  bg-dark: "oklch(0.17 0.012 345)"
  surface-dark: "oklch(0.205 0.014 345)"
  surface-2-dark: "oklch(0.24 0.016 345)"
  surface-3-dark: "oklch(0.275 0.016 345)"
  border-dark: "oklch(0.29 0.016 345)"
  border-strong-dark: "oklch(0.50 0.02 345)"
  text-dark: "oklch(0.95 0.008 345)"
  text-muted-dark: "oklch(0.80 0.016 345)"
  text-subtle-dark: "oklch(0.69 0.016 345)"
  accent-dark: "oklch(0.76 0.13 355)"
  accent-hover-dark: "oklch(0.81 0.11 355)"
  accent-soft-dark: "oklch(0.28 0.06 355)"
  on-accent-dark: "oklch(0.18 0.04 355)"
  ring-dark: "oklch(0.76 0.13 355)"
  scrim-dark: "oklch(0.12 0.01 345 / 0.65)"
  # Semantic (bible §4.1 step 4). Always paired with an icon or label.
  danger: "oklch(0.54 0.19 27)"
  danger-soft: "oklch(0.95 0.026 25)"
  danger-dark: "oklch(0.77 0.13 25)"
  danger-soft-dark: "oklch(0.28 0.06 25)"
  warning: "oklch(0.50 0.11 65)"
  warning-soft: "oklch(0.95 0.045 80)"
  warning-dark: "oklch(0.82 0.13 80)"
  warning-soft-dark: "oklch(0.29 0.05 75)"
  success: "oklch(0.52 0.12 150)"
  success-soft: "oklch(0.95 0.035 150)"
  success-dark: "oklch(0.76 0.13 150)"
  success-soft-dark: "oklch(0.28 0.05 150)"
  # Twin group palette: data colours for rings, badges, ladder bars and landing colour blocks. Never chrome.
  twin-a: "oklch(0.52 0.12 192)"
  twin-a-soft: "oklch(0.95 0.035 192)"
  twin-a-ink: "oklch(0.42 0.10 192)"
  twin-a-dark: "oklch(0.77 0.10 192)"
  twin-a-soft-dark: "oklch(0.28 0.05 192)"
  twin-a-ink-dark: "oklch(0.84 0.09 192)"
  twin-b: "oklch(0.52 0.12 58)"
  twin-b-soft: "oklch(0.95 0.035 58)"
  twin-b-ink: "oklch(0.42 0.10 58)"
  twin-b-dark: "oklch(0.77 0.10 58)"
  twin-b-soft-dark: "oklch(0.28 0.05 58)"
  twin-b-ink-dark: "oklch(0.84 0.09 58)"
  twin-c: "oklch(0.52 0.11 240)"
  twin-c-soft: "oklch(0.95 0.035 240)"
  twin-c-ink: "oklch(0.42 0.10 240)"
  twin-c-dark: "oklch(0.77 0.10 240)"
  twin-c-soft-dark: "oklch(0.28 0.05 240)"
  twin-c-ink-dark: "oklch(0.84 0.09 240)"
  twin-d: "oklch(0.52 0.12 318)"
  twin-d-soft: "oklch(0.95 0.035 318)"
  twin-d-ink: "oklch(0.42 0.10 318)"
  twin-d-dark: "oklch(0.77 0.10 318)"
  twin-d-soft-dark: "oklch(0.28 0.05 318)"
  twin-d-ink-dark: "oklch(0.84 0.09 318)"
  twin-e: "oklch(0.52 0.12 140)"
  twin-e-soft: "oklch(0.95 0.035 140)"
  twin-e-ink: "oklch(0.42 0.10 140)"
  twin-e-dark: "oklch(0.77 0.10 140)"
  twin-e-soft-dark: "oklch(0.28 0.05 140)"
  twin-e-ink-dark: "oklch(0.84 0.09 140)"
  twin-f: "oklch(0.52 0.11 100)"
  twin-f-soft: "oklch(0.95 0.035 100)"
  twin-f-ink: "oklch(0.42 0.10 100)"
  twin-f-dark: "oklch(0.77 0.10 100)"
  twin-f-soft-dark: "oklch(0.28 0.05 100)"
  twin-f-ink-dark: "oklch(0.84 0.09 100)"
  # Illustration-only pop (landing and empty-state motif only, never UI chrome)
  pop: "oklch(0.90 0.10 100)"
typography:
  display-hero:
    fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Fallback', system-ui, sans-serif"
    fontSize: "120px"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 85, 'opsz' 96"
  display:
    fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Fallback', system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 0.965
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 85, 'opsz' 96"
  headline:
    fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Fallback', system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 650
    lineHeight: 1.11
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 90, 'opsz' 48"
  title:
    fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Fallback', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.27
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 90, 'opsz' 24"
  readout:
    fontFamily: "'Bricolage Grotesque Variable', 'Bricolage Fallback', system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 0.93
    letterSpacing: "-0.03em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 85, 'opsz' 96"
  lead:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-0.012em"
  body:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "-0.01em"
  ui:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 450
    lineHeight: 1.47
    letterSpacing: "-0.005em"
  ui-compact:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.54
    letterSpacing: "0em"
  label-compact:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.54
    letterSpacing: "0em"
  caption:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 450
    lineHeight: 1.33
    letterSpacing: "0.005em"
  micro:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.01em"
  price:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.005em"
    fontFeature: "'tnum' 1"
  price-lg:
    fontFamily: "'Rethink Sans Variable', 'Rethink Fallback', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.33
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
rounded:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  full: "9999px"
spacing:
  "0.5": "2px"
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  "20": "80px"
  "24": "96px"
  "32": "128px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-primary-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.label-compact}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    height: "32px"
  button-landing-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.ui}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  summary-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.full}"
    padding: "0 6px 0 12px"
    height: "40px"
  summary-pill-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  twin-badge-a:
    backgroundColor: "{colors.twin-a}"
    textColor: "{colors.on-accent}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  twin-badge-b:
    backgroundColor: "{colors.twin-b}"
    textColor: "{colors.on-accent}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  twin-badge-a-dark:
    backgroundColor: "{colors.twin-a-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
  twin-tint-a:
    backgroundColor: "{colors.twin-a-soft}"
    textColor: "{colors.twin-a-ink}"
    typography: "{typography.label-compact}"
  twin-tint-a-dark:
    backgroundColor: "{colors.twin-a-soft-dark}"
    textColor: "{colors.twin-a-ink-dark}"
    typography: "{typography.label-compact}"
  twin-badge-b-dark:
    backgroundColor: "{colors.twin-b-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
  twin-tint-b:
    backgroundColor: "{colors.twin-b-soft}"
    textColor: "{colors.twin-b-ink}"
    typography: "{typography.label-compact}"
  twin-tint-b-dark:
    backgroundColor: "{colors.twin-b-soft-dark}"
    textColor: "{colors.twin-b-ink-dark}"
    typography: "{typography.label-compact}"
  twin-badge-c:
    backgroundColor: "{colors.twin-c}"
    textColor: "{colors.on-accent}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  twin-badge-c-dark:
    backgroundColor: "{colors.twin-c-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
  twin-tint-c:
    backgroundColor: "{colors.twin-c-soft}"
    textColor: "{colors.twin-c-ink}"
    typography: "{typography.label-compact}"
  twin-tint-c-dark:
    backgroundColor: "{colors.twin-c-soft-dark}"
    textColor: "{colors.twin-c-ink-dark}"
    typography: "{typography.label-compact}"
  twin-badge-d:
    backgroundColor: "{colors.twin-d}"
    textColor: "{colors.on-accent}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  twin-badge-d-dark:
    backgroundColor: "{colors.twin-d-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
  twin-tint-d:
    backgroundColor: "{colors.twin-d-soft}"
    textColor: "{colors.twin-d-ink}"
    typography: "{typography.label-compact}"
  twin-tint-d-dark:
    backgroundColor: "{colors.twin-d-soft-dark}"
    textColor: "{colors.twin-d-ink-dark}"
    typography: "{typography.label-compact}"
  twin-badge-e:
    backgroundColor: "{colors.twin-e}"
    textColor: "{colors.on-accent}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  twin-badge-e-dark:
    backgroundColor: "{colors.twin-e-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
  twin-tint-e:
    backgroundColor: "{colors.twin-e-soft}"
    textColor: "{colors.twin-e-ink}"
    typography: "{typography.label-compact}"
  twin-tint-e-dark:
    backgroundColor: "{colors.twin-e-soft-dark}"
    textColor: "{colors.twin-e-ink-dark}"
    typography: "{typography.label-compact}"
  twin-badge-f:
    backgroundColor: "{colors.twin-f}"
    textColor: "{colors.on-accent}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  twin-badge-f-dark:
    backgroundColor: "{colors.twin-f-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
  twin-tint-f:
    backgroundColor: "{colors.twin-f-soft}"
    textColor: "{colors.twin-f-ink}"
    typography: "{typography.label-compact}"
  twin-tint-f-dark:
    backgroundColor: "{colors.twin-f-soft-dark}"
    textColor: "{colors.twin-f-ink-dark}"
    typography: "{typography.label-compact}"
  fold-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.md}"
    padding: "16px"
  fold-card-header:
    backgroundColor: "{colors.twin-a-soft}"
    textColor: "{colors.twin-a-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  ladder-bar:
    backgroundColor: "{colors.twin-a-soft}"
    textColor: "{colors.twin-a-ink}"
    rounded: "{rounded.xs}"
    width: "100%"
  ladder-rung-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.price-lg}"
  brand-tax-tag:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "28px"
  established-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  few-reviews-note:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: "6px 8px"
  proof-lens:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.lg}"
    padding: "24px"
    width: "min(760px, calc(100vw - 32px))"
  proof-viewport:
    backgroundColor: "{colors.surface}"
    size: "400px"
  segmented:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.sm}"
    padding: "2px"
    height: "32px"
  segmented-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.xs}"
  keycap:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
    typography: "{typography.micro}"
    rounded: "{rounded.xs}"
    padding: "0 5px"
    height: "20px"
  switch-on:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "20px"
  switch-off:
    backgroundColor: "{colors.border-strong}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "20px"
  popup-shell:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.ui-compact}"
    width: "360px"
    padding: "12px"
  stat-row:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.ui-compact}"
    height: "32px"
  privacy-panel:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.md}"
    padding: "12px"
  toast:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  tooltip:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: "4px 8px"
  options-page:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.ui}"
    width: "720px"
    padding: "32px"
  landing-block:
    backgroundColor: "{colors.twin-a-soft}"
    textColor: "{colors.twin-a-ink}"
    typography: "{typography.lead}"
    rounded: "{rounded.lg}"
    padding: "48px"
  install-command:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  focus-ring:
    backgroundColor: "{colors.ring}"
    rounded: "{rounded.sm}"
    width: "2px"
  focus-ring-dark:
    backgroundColor: "{colors.ring-dark}"
    rounded: "{rounded.sm}"
    width: "2px"
  selection:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text}"
  selection-dark:
    backgroundColor: "{colors.accent-soft-dark}"
    textColor: "{colors.text-dark}"
  dialog-scrim:
    backgroundColor: "{colors.scrim}"
  dialog-scrim-dark:
    backgroundColor: "{colors.scrim-dark}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.ui}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "40px"
  meta-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-subtle}"
    typography: "{typography.caption}"
  slider-track:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.full}"
    height: "4px"
  popup-shell-dark:
    backgroundColor: "{colors.bg-dark}"
    textColor: "{colors.text-dark}"
    typography: "{typography.ui-compact}"
    width: "360px"
  fold-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    typography: "{typography.ui-compact}"
    rounded: "{rounded.md}"
  privacy-panel-dark:
    backgroundColor: "{colors.surface-2-dark}"
    textColor: "{colors.text-muted-dark}"
    rounded: "{rounded.md}"
  meta-text-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-subtle-dark}"
    typography: "{typography.caption}"
  button-primary-hover-dark:
    backgroundColor: "{colors.accent-hover-dark}"
    textColor: "{colors.on-accent-dark}"
  brand-tax-tag-dark:
    backgroundColor: "{colors.danger-soft-dark}"
    textColor: "{colors.danger-dark}"
    typography: "{typography.label-compact}"
    rounded: "{rounded.full}"
  few-reviews-note-dark:
    backgroundColor: "{colors.warning-soft-dark}"
    textColor: "{colors.warning-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
  copied-check:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  copied-check-dark:
    backgroundColor: "{colors.success-soft-dark}"
    textColor: "{colors.success-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  segmented-dark:
    backgroundColor: "{colors.surface-3-dark}"
    textColor: "{colors.text-muted-dark}"
    rounded: "{rounded.sm}"
  input-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
  divider-strong:
    backgroundColor: "{colors.border-strong}"
    height: "1px"
  divider-dark:
    backgroundColor: "{colors.border-dark}"
    height: "1px"
  divider-strong-dark:
    backgroundColor: "{colors.border-strong-dark}"
    height: "1px"
  landing-pop-motif:
    backgroundColor: "{colors.pop}"
    textColor: "{colors.text}"
---

# Design System: Factory Twins

## Overview

**Creative North Star: "The Contact Sheet"**

A photographer's contact sheet is a grid of near-identical frames, and the photographer's tools are a china marker and a loupe: circle the frames that match, then lean in and check. A shopping results page is the same grid. Factory Twins hands the shopper the marker (rings in shared colours), a way to gather the circled frames onto one strip (the fold card's price ladder), and the loupe (the Proof lens, where two photos cancel to black). The metaphor is the mechanism, so it can be used without explaining it.

The system is quiet where the shopper works and loud where they discover. On the store page it is precise, small and reversible: crisp rings that follow the store's own tile corners, a pill that sits out of the way, nothing that shifts the store's layout until the shopper asks. Expression is spent in three places only: the fold (the signature moment), the Proof lens readout, and the landing page, where the contact-sheet grid, oversized twin-colour blocks and one hand-drawn marker circle carry the brand. Berry ink (mulberry) is ours and marks our controls; the twin palette belongs to the shopper's data and never becomes chrome.

Assigned by the studio and not negotiable: colour direction **D4 Mulberry** and pairing **T6 Bricolage Grotesque + Rethink Sans**. Archetype: **A4 Playful utility**, with the A6 extension-popup constraints (DESIGN_BIBLE §8.3).

**Key Characteristics:**
- Light-first blush-neutral paper (bg `oklch(0.985 0.004 345)`), berry-ink accent `oklch(0.48 0.17 355)` used as a signal, never as paint.
- A six-colour twin palette with equal lightness (L 0.52 light, 0.77 dark) so no group looks more important than another; each group also carries a letter and a ring pattern.
- Bricolage Grotesque only at discovery moments (fold header, brand tax, readout, landing hero); Rethink Sans for every working surface.
- Soft-plus radii (8/12/16/24) with pills reserved for status objects (summary pill, badges, tags). Buttons are rectangles.
- Depth by surface steps and 1px hairlines; shadow only on things that float above the store page.
- One choreographed fold; everything frequent renders instantly.

### Brand blend (bible §10, non-cloning rule)

- **From Figma we took** the mechanism of a restrained frame interrupted by oversized colour blocks that each carry one story, one block per viewport, with the frame returning between them. Our blocks are the twin palette's soft tints, so a landing section literally becomes "Twin A". We also took pills as the shape for status objects. **We rejected** black primary CTAs, pill buttons, uppercase mono eyebrows, the variable sans and every block hex.
- **From PostHog we took** the friendly engineering-blog voice (plain, specific, a little wry) and the hand-made marginalia energy, re-expressed as one bespoke monoline motif: an irregular china-marker circle, drawn once per landing viewport at most. We also took the dark code island for the install command. **We rejected** the cream canvas, the yellow CTA, the mascot, IBM Plex, uppercase eyebrows and emoji callouts.
- **From Notion we took** the rule that a pastel tag palette belongs to user data and stays off the chrome (our twin palette), sober rectangular buttons, and the real working UI as the hero. **We rejected** the purple CTA, the navy hero band, the centred hero and the brand typeface.
- **Our version differs by** berry ink on blush paper, Bricolage at `wdth 85`, the contact-sheet marker motif, and data colours that double as section colours on the landing page only.
- Studio distinctness: D4 + T6 + soft-plus radius + rect CTA + light default. Signature moment is bespoke (the fold into a price ladder), not one of the bible's M1–M15, so it cannot collide with a sibling project.

### We never (P8)

1. **We never say "same item".** Every label, tooltip, alt text and landing line claims only what the pixels prove: "Same photo ×5", "These 5 listings use the same photo". Banned: "same item", "same product", "identical product", "dupe", "knockoff". A copy-lint test enforces it.
2. **We never put the accent on the shopper's data.** Mulberry marks our controls, focus and the pill glyph. Rings, badges, ladder bars and prices use the twin palette or neutrals. The accent is never a ring colour.
3. **We never change the store's page without being asked.** Before the shopper presses `F`, we add nothing that moves a single store pixel: the pill floats, rings live inside tiles in shadow roots. Unfold restores the grid exactly, with no leftover attributes.

## Colors

Berry ink on blush paper, with six marker colours that belong to the shopper's results.

### Primary
- **Berry Ink** (`oklch(0.48 0.17 355)`, ≈ `#a02262`; dark `oklch(0.76 0.13 355)` ≈ `#f18db5`): primary buttons (one filled per view), focus rings, the twin glyph in the pill and the wordmark, the selected segment indicator, links in the options page. 6.9:1 on bg light, 8.4:1 on bg dark. ΔE_OK to the nearest blocklisted brand: 0.204 light (Airbnb), 0.115 dark (Raycast).
- **Berry Ink Pressed** (`oklch(0.43 0.16 355)`): hover and pressed fill of primary buttons.
- **Berry Wash** (`oklch(0.95 0.025 355)`; dark `oklch(0.28 0.06 355)`): text selection, the active row in popup lists, `accent-soft` backgrounds. Berry Ink on Berry Wash: 6.2:1 light, 6.6:1 dark.

### Twin palette (data colours)
Equal L and near-equal C so no group outranks another. Light solids are 5.2–5.9:1 on white and carry white badge text at ≥ 5.0:1; dark solids are ≥ 8.9:1 on the dark bg with dark text at ≥ 8.8:1. Soft/ink pairs are ≥ 7.0:1 in both themes. Every solid is ≥ 0.06 ΔE_OK from the bible §4.4 blocklist.

| Group | Hue | Name | Ring pattern | Light solid | Dark solid |
|---|---|---|---|---|---|
| A | 192 | Teal Marker | solid | ≈ `#007976` | ≈ `#5cc9c5` |
| B | 58 | Amber Marker | dashed | ≈ `#9b540c` | ≈ `#e5a473` |
| C | 240 | Lake Marker | dotted | ≈ `#1870a1` | ≈ `#76bdee` |
| D | 318 | Plum Marker | double | ≈ `#855095` | ≈ `#cfa0de` |
| E | 140 | Fern Marker | solid + corner notch | ≈ `#3f7932` | ≈ `#92c487` |
| F | 100 | Olive Marker | dashed + corner notch | ≈ `#786900` | ≈ `#c3b668` |

Groups beyond F cycle the palette and patterns with their own letter (G reuses A's colour with a dotted ring), so the letter is always the unique key.

### Semantic
- **Brand-tax Red** (`danger`, `oklch(0.54 0.19 27)` on `danger-soft`): only the "Brand tax +$X" tag and true errors. Always with an icon. 4.8:1 light, 6.8:1 dark.
- **Few-reviews Amber** (`warning` on `warning-soft`): the "Few reviews" note under a rung. Always with the alert-triangle icon.
- **Success Green** (`success`): "Copied" confirmations and the privacy panel's "0 to anyone else" check icon only.

### Neutral
- **Blush Paper** (`bg`): page background of popup, options and landing.
- **Sheet White** (`surface`): cards, pill, dialog, fold card.
- **Proof Grey** (`surface-2`, `surface-3`): segmented track, keycaps, privacy panel, hovered rows. One step = +0.035 L in dark mode.
- **Photo Mat** (`photo-mat`, pure white in both themes): the square behind every product photo we display (fold card, Proof lens, ghosts). Marketplace photos are shot on white, so the mat is never themed.
- **Hairline** (`border`) and **Edge** (`border-strong`, 3.8:1): 1px dividers; input and switch-off borders.
- **Ink** (`text`, 16.3:1), **Graphite** (`text-muted`, 6.9:1), **Pencil** (`text-subtle`, 4.7:1 on bg).
- **Pop Yellow** (`pop`, `oklch(0.90 0.10 100)`): landing illustration and empty-state motif only. Deviation from the bible's D4 pop `oklch(0.86 0.15 92)`, which measured ΔE_OK 0.024 from Miro's signature yellow; ours measures 0.075.

### Named Rules
**The Marker Belongs to the Shopper Rule.** Twin colours mark the shopper's results and the landing blocks that tell their story. They never colour a button, a focus ring, a nav item or our logo.

**The One Berry Rule.** At most one filled Berry Ink button per view, and Berry Ink covers ≤ 5% of any screen's pixels.

**The Pencil Floor Rule.** `text-subtle` (Pencil) is for meta labels on `bg` or `surface` only. On `surface-2` it measures 4.29:1, so text there uses `text-muted`.

## Typography

**Display Font:** Bricolage Grotesque Variable (axes wght 200–800, wdth 75–100, opsz 12–96), fallback `'Bricolage Fallback'` = local Arial with `size-adjust: 96%`, `ascent-override: 92%`.
**Body Font:** Rethink Sans Variable (wght 400–800), fallback `'Rethink Fallback'` = local Arial with `size-adjust: 100%`, `ascent-override: 94%` (final overrides measured in the UI stage with a metric tool; CLS must stay 0).
**Mono:** none. Prices and counts use Rethink Sans with `tnum`; there is no code or identifier in the UI except the landing install command, which uses Rethink Sans 500 on the dark island.

**Character:** Bricolage at `wdth 85` is a poster face with ink-trap swagger: it says "look at this" exactly where something was found. Rethink Sans is round, open and calm, and does the work everywhere else. The contrast is width and attitude, not serif versus sans.

### Hierarchy
- **Display hero** (Bricolage 700, `clamp(3.5rem, 2rem + 6vw, 7.5rem)`; the frontmatter token holds the 120px maximum because the format does not accept `clamp()`, lh 0.92, −0.035em, `wdth 85 opsz 96`): landing H1 only, once per page.
- **Display** (Bricolage 700, 56/54, −0.03em, `wdth 85`): landing section heads inside colour blocks; README hero.
- **Headline** (Bricolage 650, 36/40, −0.025em, `wdth 90`): options page title, landing sub-heads.
- **Title** (Bricolage 600, 22/28, −0.015em, `wdth 90`): fold-card header "These 5 listings use the same photo", Proof lens title, popup unsupported-state heading.
- **Readout** (Bricolage 700, 56/52, `tnum`, `wdth 85`): Proof lens "99.6%".
- **Lead** (Rethink 400, 19/28): landing intro paragraphs, max 56ch.
- **Body** (Rethink 400, 16/26): landing prose, options help text, max 68ch.
- **UI** (Rethink 450, 15/22): options controls, landing buttons.
- **UI compact** (Rethink 400, 13/20) and **Label compact** (550, 13/20): overlay, popup. Default text of the extension.
- **Price** (Rethink 600, 15/20, `tnum`) and **Price large** (650, 18/24, `tnum`): pill numbers, ladder rung prices.
- **Caption** (Rethink 450, 12/16): rating and review counts under rungs, meta.
- **Micro** (Rethink 600, 11/16, +0.01em): badges ("Twin A ×5"), keycaps.

Features everywhere: `font-synthesis: none`; `font-optical-sizing: auto`; `tnum` on every price, count and percentage; `text-wrap: balance` on Title and above; `text-wrap: pretty` on Body. Use `×` (U+00D7) in "×5", `…` for truncation, `&nbsp;` between number and unit ("$23.00 brand tax" keeps "$23.00" whole).

**Extension font shipping:** Rethink Sans latin wght woff2 (35.7 KB) as published; Bricolage as a build-time instance (wdth pinned to 85, wght and opsz kept, glyphs subset to Latin-1 + `×→…₍₎`) targeting ≤ 30 KB, generated by `scripts/subset-fonts.ts`. The landing page uses the full-axes file (131.5 KB) with `font-display: swap`, preloading only Rethink.

### Named Rules
**The Three Places Rule.** Bricolage appears in at most three places per screen, and on the store page only inside the fold card and the Proof lens. The pill, rings and badges are always Rethink Sans.

**The Never Shout Rule.** No uppercase eyebrows, no letter-spaced labels, no weight above 700 anywhere, and no single coloured or italic word inside a headline.

## Layout

**Spacing:** 4px base, tokens `0.5`–`32` (2–128 px). Compact density on the store page and popup (control height 32, padding 12, gaps 4–8), comfortable on options and landing (control height 40–44, padding 20–24, gaps 8–12, sections 80 mobile / 128 desktop).

**Overlay on the store page:**
- Pill: fixed, `bottom: 16px; right: 16px` (adapter can move it left or up to avoid store widgets), max width `min(560px, 100vw - 32px)`, wraps to two lines below 480 px wide.
- Rings: per-tile host absolutely positioned at `inset: -4px`, outline drawn at the tile's own border radius + 4px, so rings never touch tile content.
- Fold card: inserted as one full grid row (adapter sets `grid-column: 1 / -1` or flex-basis 100%), max width matching the results column. Inner grid: photo column 160 px (120 px under 720 px card width), content column fluid. Ladder: one equal-width column per rung, min 96 px; above 6 rungs it scrolls horizontally inside the card with edge fades and `scrollbar-gutter: stable`.
- Proof lens: centred dialog `min(760px, 100vw - 32px)`; two columns (viewport 400 px square, readout and controls) collapsing to one column below 640 px, where the viewport becomes `min(400px, 100vw - 80px)`.

**Popup:** 360 px wide, natural height ≤ 520 px, 12 px padding, no vertical scroll for the primary task (stats + one action + privacy). Rows 32 px.

**Options page:** single column, max width 720 px, 32 px gutter desktop / 16 px at 375, sections separated by 48 px with a 1px hairline above each section title.

**Landing:** content max 1200 px, gutters 16 / 24 / 32 at 375 / 768 / 1440, 12-column grid at 1440, 8 at 768, 4 at 375. Colour blocks span the content width with radius lg, inset 32 px from the gutter on desktop, full-bleed with radius 0 below 768 px. Left-aligned copy throughout; the hero is asymmetric (copy left 5 columns, the live contact-sheet demo right 7 columns, stacking below 960 px with the demo first after the H1 and CTA).

### Named Rules
**The Zero-Shift Rule.** Nothing we render before the shopper presses `F` changes the size or position of a store element. Async numbers reserve width with `min-width` in `ch` and `tnum`.

## Elevation & Depth

Depth comes from tone and hairlines. Shadows exist only for things that float above the store page or above our own pages (pill, tooltips, toasts, the Proof lens), layered and tinted with the neutral hue (H_n 345). In dark mode, elevation is surface steps (+0.035 L) plus a 1px border and a top inner highlight; only the modal keeps a shadow.

### Shadow Vocabulary
- **e0 flat** (`none`): page, inline content, fold card (sits in the store's grid, uses e1).
- **e1 ring** (`box-shadow: 0 0 0 1px var(--border), 0 1px 2px oklch(0.25 0.02 345 / 0.04)`): fold card, inputs at rest, popup cards.
- **e2 raised** (`box-shadow: 0 0 0 1px oklch(0.25 0.02 345 / 0.06), 0 1px 1px oklch(0.25 0.02 345 / 0.02), 0 2px 4px -1px oklch(0.25 0.02 345 / 0.06)`): fold ghosts in flight.
- **e3 float** (`box-shadow: 0 0 0 1px oklch(0.25 0.02 345 / 0.06), 0 2px 4px -1px oklch(0.25 0.02 345 / 0.06), 0 8px 16px -4px oklch(0.25 0.02 345 / 0.12)`): summary pill, tooltips, toasts, badge hover card.
- **e4 modal** (`box-shadow: 0 0 0 1px oklch(0.25 0.02 345 / 0.06), 0 8px 16px -4px oklch(0.25 0.02 345 / 0.08), 0 24px 48px -12px oklch(0.25 0.02 345 / 0.22)`): Proof lens.
- **Dark e1–e3** (`box-shadow: 0 0 0 1px var(--border), inset 0 1px 0 oklch(1 0 0 / 0.05)`), **dark e4** (`0 0 0 1px oklch(1 0 0 / 0.06), 0 24px 48px -12px oklch(0 0 0 / 0.6)`).
- **Scrim:** `scrim` (light) / `scrim-dark`, no blur.

**Z-index:** overlay hosts use `2147483647` inside their shadow roots (bible §5.4); inside our pages: base 0, sticky 10, dropdown 20, overlay 30, modal 40, toast 60, tooltip 70.

### Named Rules
**The No Glass Rule.** No `backdrop-filter` anywhere, including the pill over store content. Opaque surfaces only.

## Shapes

Soft-plus radii: **xs 8** (badges' inner elements, keycaps, ladder bars, tooltip), **sm 12** (buttons, inputs, segmented track, toast), **md 16** (fold card, popup cards, privacy panel, Proof viewport), **lg 24** (Proof lens dialog, landing colour blocks), **full** (summary pill, twin badges, brand-tax tag, established chip, switches). Nested radii are concentric (inner = outer − padding, rounded down to a scale step): the 2px-padded segmented track at 12 holds xs 8 segments; the Proof lens at 24 with 24 padding holds a square-cornered viewport (radius 0), which is also how a contact-sheet frame looks.

**One CTA grammar: rectangles.** Every button is a rect at sm 12. Pills mean status or a toggle that summarises state (the summary pill, badges, tags), never "do something new".

**Rings** are not a radius token: they inherit the store tile's computed `border-radius` + 4 px so they hug the store's own shape.

**The marker circle** (landing only): one monoline SVG path, 3 px stroke, round caps, slightly irregular (start and end overlap by 12°, radius varies ±4%), drawn in the group colour around a twin cluster. Hand-drawn once in the source SVG, never generated by a filter.

## Components

### Buttons
- **Shape:** rect, sm 12 (12px), height 32 compact / 44 landing.
- **Primary:** Berry Ink fill, `on-accent` text, label-compact 13/550. One per view. Dark: `accent-dark` fill with `on-accent-dark` text at 13/600 minimum (bible §4.3).
- **Secondary:** Sheet White with 1px `border` and e1; hover moves to `surface-2`.
- **Ghost:** transparent, `text-muted`; hover `surface-2`.
- **States:** hover is a 100 ms background step (pointer: fine only); press `scale(0.97)` 100 ms ease-out; focus-visible `outline: 2px solid var(--ring); outline-offset: 2px`; disabled `opacity .5` + tooltip explaining why; loading keeps the label, prepends a 14 px spinner, locks width, `aria-busy`.
- **Shortcut hint:** buttons with a key show a keycap at the right edge ("Fold twins  F").

### Summary pill (overlay, passive, every search)
- **Look:** Sheet White, full radius, e3, height 40, the twin glyph (16 px, Berry Ink) at the left, then three segments separated by 1 × 16 px `border` dividers: **"60 listings → 37 products"**, **"6 twin groups"**, **"up to $18 brand tax"**. (picks.json writes this line with middle dots; in the UI the dots are drawn dividers.) Numbers Price 15/600 `tnum` in `text`; words UI compact in `text-muted`. Trailing 28 px ghost icon button "×" (Hide for this page).
- **Interaction:** the pill body is a `<button>`: click rings twins (`T`). When rings are on, the pill extends by a secondary button "Fold twins F" (width animates via grid `0fr → 1fr`, 200 ms ease-out; 0 ms when triggered by keyboard).
- **States:**

| State | Content | Notes |
|---|---|---|
| Scanning | twin glyph + "Checking 60 photos… 24/60" with a 2px Berry Ink progress line along the pill's bottom edge | appears only if scanning takes > 300 ms; min visible 400 ms |
| Result | as above | NumberFlow-style digit roll is not used here (frequent surface): numbers render final immediately |
| No twins | "60 listings, no shared photos on this page" | muted, no fold button |
| Session | "120 listings across 2 pages → 71 products", "9 twin groups", "up to $23 brand tax" | three segments with drawn dividers |
| Error | danger icon + "Couldn't read this page's listings." + ghost link "Report layout" | link opens a prefilled GitHub issue with store, adapter version and page type only |
| Hidden | nothing rendered | after "×" until next navigation |
| Off for this store | nothing rendered | settings |

- **Accessibility:** accessible name "60 listings, 37 products, 6 twin groups, up to 18 dollars brand tax. Show twins." Result updates announce once via `aria-live="polite"`.

### Rings and twin badges (overlay, per tile)
- **Ring:** `outline: 3px <pattern> var(--twin-x); outline-offset: 4px;` with the tile's radius. Patterns per the twin palette table. No fill, no shadow, no glow.
- **Badge:** full-radius chip at the tile's top-left, 6 px inside the ring: group solid fill, white (light) or `on-accent-dark` (dark) text, Micro 11/600: **"Twin A ×5"**. With session memory and cross-page members: **"Twin A ×9"** with a tooltip "Same photo on 9 listings across 3 pages".
- **Variants of one listing:** a neutral chip "3 variants" (surface-2, text-muted) instead of a ring. Never a twin colour.
- **Hover/focus on badge:** the other members' rings thicken to 4px (100 ms), and a tooltip (e3) says "Same photo as 4 other listings on this page" plus "Check the pixels P".
- **Timing:** rings appear and disappear at 0 ms (P1).

### Fold card (signature surface)
- **Container:** Sheet White, md 16 radius, e1, 3 px top band in the group solid, padding 16.
- **Header row:** group photo (160 px square, md radius inner 8, on white) at the left; to its right the Title "These 5 listings use the same photo" in Bricolage 22/600, the badge "Twin A ×5", and right-aligned the **brand-tax tag** (danger-soft, receipt icon, label "Brand tax +$23.00").
- **Price ladder:** one equal-width column per member, ordered by comparable price ascending. Each column, top to bottom: a 40 px thumbnail of that listing's own photo (proves the match per rung), a bar whose height is proportional to price (min bar 24 px, max 96 px, xs radius, group soft fill with a 2 px group-ink top edge; cheapest bar labelled "Lowest", priciest "Highest"), the price in Price large ("$11.99", "per unit" caption under it when pack sizes differ, "from" prefix for ranges), brand (caption, 1 line, ellipsis), rating (12 px star glyph + "4.5") and, as a separate element, the review count ("3,918 reviews"), tags ("Sponsored", "page 2", "Most established").
- **Bracket:** a 1.5 px `danger` line from the top of the Lowest bar to the top of the Highest bar with the brand-tax amount anchored at its midpoint (redundant with the tag; decorative, `aria-hidden`).
- **Few-reviews note:** under a rung with 0–9 reviews when another member has ≥ 100: warning-soft note with alert-triangle icon, "Few reviews. Uses the same photo as a listing with 14,203 reviews."
- **Footer row:** ghost button "Check the pixels P" (opens Proof lens), ghost "Unfold F", and a caption "Factory Twins compares photos, not products."
- **States:**

| State | Content |
|---|---|
| Folding | the choreography below; content `aria-busy` |
| Folded (success) | as above; live region: "Folded 6 twin groups. Twin A: 5 listings use the same photo, $11.99 to $34.99." |
| Partial prices | rungs without price show "No price shown" in caption; tag only if ≥ 2 priced members |
| Mixed pack sizes | "per unit" captions; tag says "Brand tax +$4.10 per unit" |
| Member on another page | rung thumbnail with a "page 2" chip; the rung links there |
| Error (a member's tile vanished after lazy reload) | rung shows "This listing left the page" in muted caption; ladder recalculates |

### Proof lens (signature surface 2)
- **Dialog:** Radix Dialog rendered into the overlay shadow root's portal container; e4; lg 24 radius; 24 padding; scrim. Title (Bricolage 22/600): "Check the pixels". Below it, two labelled pickers, "Top photo" and "Bottom photo" (Radix Select; each option shows the rung's price and brand as two text elements), defaulting to the lowest and highest rung.
- **Viewport:** 400 px square on white, square corners (radius 0, concentric with the 24 px dialog padding). Bottom image = photo B; top image = photo A. Onion skin: top opacity = slider value. Difference: top image `mix-blend-mode: difference`, opacity 1.
- **Controls:** segmented "Onion skin | Difference" (keys `O`, `D`); slider (track `surface-3`, 4 px; thumb 20 px Sheet White with e3 and Berry Ink focus ring; arrows 5%, Shift+arrows 25%); "Swap photos" ghost.
- **Readout:** Readout type "99.6%" + Title-size word "identical"; below in UI compact muted: "0.4% of pixels differ"; caption: "Measured on both photos at 256 × 256. A pixel differs when any colour channel changes by more than 24 of 255."
- **States:**

| State | Content |
|---|---|
| Loading (readout) | readout area shows a skeleton block the exact size of "99.6%" after 150 ms; viewport shows the images immediately (they are already on the page) |
| Success | number rolls in once (400 ms, digits slide up, `tnum`), then static |
| Identical | "100%" only when zero pixels differ, plus "No pixel differs." |
| Different photos | e.g. "71.2% identical" with the line "These photos differ in places. Look at the bright areas in Difference mode." |
| Error | danger icon + "Couldn't read one of these photos. The store's image server didn't return it." + secondary button "Try again" |

### Popup
- **Shell:** 360 px, `bg`, 12 px padding, Rethink compact. Follows `prefers-color-scheme`.
- **Header (40 px):** twin glyph + "Factory Twins" (Label compact 13/550) + right-aligned status chip ("On for Amazon" with a 6 px success dot / "Not a search page").
- **Supported page, success:** stat rows (label left in `text-muted`, value right in Price `tnum`): Listings 60, Products 37, Twin groups 6, Largest brand tax $18.00, one row each. Primary button "Show twins on this page" with keycap `T`; secondary "Fold twins" `F`. Switch row "Run on Amazon". Privacy panel. Footer: ghost "Shortcuts" (opens the cheatsheet list inline) and ghost "Settings".
- **Privacy panel:** surface-2, md radius. Title row: shield icon + "Nothing leaves your device." (Label compact). Body: "184 image reads this session, all from m.media-amazon.com." and a success check + "0 to anyone else." Caption: "Factory Twins re-reads thumbnails from the store's own image server to compare them. It has no server of its own."
- **States:**

| State | Content |
|---|---|
| Empty (unsupported page) | Title-size Bricolage "Open a search page" + body "Factory Twins works on Amazon.com and Walmart.com search results." + two secondary buttons "Search Amazon" / "Search Walmart" (open `https://www.amazon.com/s?k=laptop+stand` style example links in a new tab) |
| Loading (page still scanning) | stat rows show skeleton values of exact width (show after 150 ms, min 300 ms) and "Checking photos… 24/60" |
| Error (adapter failed) | danger icon row "Couldn't read this page's listings." + "Report layout" link; switches still work |
| Off for this store | stats hidden, single row "Off on Amazon" + switch |
| Success after "Clear this session" | toast "Session cleared" with an "Undo" button, 6 s |

### Options page
- Full tab, `bg`, max 720 px, Headline "Settings". Sections with Label titles and Body help (≤ 56ch): **Stores** (two switch rows), **Behaviour** (Show the summary pill automatically; Ring twins automatically; Remember twins across pages; Single-key shortcuts), **Matching** (segmented Standard | Strict, with one sentence each), **Shortcuts** (keycap table + "Change browser shortcuts" outbound link to `chrome://extensions/shortcuts` with the M14-style hover arrow), **Privacy** (same panel as popup, plus "Clear this session"), **About** (version, source repo link, licence).
- Changes save instantly (optimistic) with an inline "Saved" status beside the section title (fades after 1.5 s); failure reverts the control and shows "Couldn't save. Try again." inline.
- Empty/loading/error: settings load from `storage.local` synchronously after first paint; until then controls render in their default positions with `aria-busy` (no skeleton needed, < 50 ms); error state: "Couldn't load settings. Defaults are shown." with a "Reload" button.

### Keycaps, tooltips, toasts, switches
- **Keycap:** 20 px tall, min-width 20, padding 0 5, xs radius, surface-2, 1px border, `box-shadow: inset 0 -1px 0 var(--border)`, Micro type. When the real key is pressed, the matching visible keycap sets `data-pressed` for 120 ms: `translateY(1px)`, inset shadow removed.
- **Tooltip:** ink background, bg text, caption type, xs radius; first open after 500 ms, siblings instant; `opacity` + `scale(.97)` 125 ms; shows "Label  Key".
- **Toast:** ink background, sm radius, bottom-centre of popup / bottom-left of the store page (away from the pill); 4 s, or 6 s with an action; `aria-live="polite"`.
- **Switch:** 32 × 20, full radius; on = Berry Ink, off = Edge; thumb 16 px Sheet White, `SPRING.snappy` (180 ms, no bounce).

### Shortcut map and command list
| Key | Where | Action |
|---|---|---|
| `T` | store page, no input focused | Show / hide twin rings |
| `F` | store page | Fold / unfold twins |
| `P` | store page, a group focused or the first group | Open the Proof lens |
| `O` / `D` | Proof lens | Onion skin / Difference |
| `←` `→` (Shift ×5) | Proof lens slider | Move 5% (25%) |
| `Esc` | anywhere in the overlay | Close lens, then collapse pill |
| `?` | store page | Toggle the shortcut cheatsheet popover above the pill |
| `Alt+Shift+T`, `Alt+Shift+F` | browser-level `commands` | Same as `T`, `F`; rebindable |

**Command palette:** deliberately not built for v0.1. The complete action set is five actions, all visible as labelled controls with keycaps on the pill, the popup and the cheatsheet; a cmdk palette injected into a store page would add a sixth surface that competes with the store's own search box. This is a written deviation from the bible §6.8 per its prime directive.

### Motion system
Tokens (bible §5.5): `--dur-0 0ms`, `--dur-1 100ms`, `--dur-2 150ms`, `--dur-3 200ms`, `--dur-4 250ms`, `--dur-5 300ms`; `--ease-out cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-out-soft cubic-bezier(0.25, 1, 0.5, 1)`, `--ease-in-out cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-scene cubic-bezier(0.65, 0.05, 0, 1)` (landing only), `--spring-playful linear(0, 0.157, 0.48, 0.79, 1.01, 1.11, 1.12, 1.08, 1.03, 0.99, 0.98, 0.99, 1)` (CSS approximation of `SPRING.playful`, visualDuration 0.4, bounce 0.25; signature moments only). Popup/options use Motion with `MotionConfig reducedMotion="user"` and the bible `SPRING` presets; the overlay uses WAAPI with the same values. Never `transition: all`; animate `transform`, `opacity` and `clip-path` only.

- **Instant (0 ms):** rings on/off, pill appearing in result state, popup open, keyboard navigation, unfold when triggered within 2 s of a fold (treated as an undo).
- **Small (100–200 ms):** hover colours, press scale, tooltip, pill extension, toast exit.
- **Dialog (220 ms):** Proof lens enter `opacity 0→1, scale .96→1, y 8→0`, `--ease-out`; exit 160 ms; scrim 150 ms.

### Signature moment: "Fold twins" (frame by frame)
Trigger: `F` or the pill's "Fold twins". Deviation from bible P1 (keyboard actions animate at 0 ms), written here as required: the fold is the product's one rare, meaningful event (a few times a week, not 20 times a day), and the motion is the explanation of what happened to the store's grid. It stays interruptible and is skippable by OS reduced motion. Unfold is fast.

| t (ms) | What moves | Property and value | Easing |
|---|---|---|---|
| 0 | State commits. Ghost `<img>` clones of every member mount in the overlay layer at each tile's exact rect (same URL, same pixels, so no flash); originals set `visibility: hidden`. The fold-card host is inserted before the leader tile with its content at `opacity: 0`. Pill button label swaps "Fold twins" → "Unfold twins" (no animation). | — | — |
| 0–120 | Ghosts lift. | `scale 1 → 0.94`, shadow e2 fades in | `--ease-out` |
| 0–300 | Store tiles that reflow because members are now hidden FLIP from their old to new positions (inline `transform`, removed at the end). | `translate(Δx, Δy) → 0` | `--ease-in-out` |
| 0–320 | Fold-card background grows from the leader tile's rect to its own rect. | `clip-path: inset(...)` from leader rect to `inset(0 round 16px)` | `--ease-out-soft` |
| 80–560 | Ghosts travel to their rung thumbnail slots, cheapest first, 40 ms stagger by price rank, 400 ms each, shrinking to 40 px. | FLIP `translate + scale` | `--ease-in-out` |
| 440–640 | Ladder bars grow from the baseline, 30 ms stagger. | `scaleY 0 → 1`, origin bottom, 200 ms | `--ease-out` |
| 520–680 | Card header, prices, ratings and review counts appear; ghosts swap for the real rung thumbnails (identical pixels, invisible swap). | `opacity 0 → 1`, 160 ms | `--ease-out` |
| 640–760 | The bracket draws from Lowest to Highest. | `scaleX 0 → 1`, origin left, 120 ms | `--ease-out` |
| 660–980 | "Brand tax +$23.00" tag lands. | `opacity 0 → 1`, `scale 0.9 → 1`, 320 ms | `--spring-playful` |
| 980 | Settled. Live region announces the fold summary. Focus moves to the first fold card's title if the fold was keyboard-triggered. | — | — |

- **Interrupt:** pressing `F` (or clicking Unfold) during the fold calls `reverse()` on every running animation from its current time; state commits immediately.
- **Unfold:** 0–200 ms card content fades out, 0–240 ms ghosts return to their tile rects (no stagger), 240 ms originals revealed and ghosts removed; reflowing tiles FLIP 200 ms. Total ≤ 300 ms.
- **Reduced motion:** no ghosts, no FLIP. Members hide and the card appears with a 150 ms opacity crossfade; tag and bracket are static.
- **Performance:** ≤ 8 ms per frame on a mid laptop; at most 12 ghosts animate (members beyond 12 fade into place).

### Signature moment 2: "Cancel to black" (Proof lens)
| t (ms) | What moves | Value |
|---|---|---|
| 0 | `D` pressed / Difference selected. A second copy of photo A with `mix-blend-mode: difference` mounts over the stack at `opacity 0`. | — |
| 0–400 | The difference copy fades in while the normal top copy fades out; matching pixels sink toward black. | `opacity`, 400 ms `--ease-in-out` |
| 400 | Frame is black where the photos match. The readout gains a 2 px Berry Ink underline (scaleX 0 → 1, 150 ms). | — |
| Reduced motion | Instant swap, no underline animation. | — |

The readout number's single roll happens once per lens open, when the measurement returns (400 ms, digits translateY with masked edges); never again for the same pair.

### Landing page components (for `site/`)
- **Nav bar (56 px):** wordmark left, links "How it works", "Privacy", "Source" and a secondary button "Add to Chrome" right. Sticky with an opaque `bg` at 92% plus a hairline when scrolled (no blur, per The No Glass Rule).
- **Hero:** Display hero H1, Lead, primary "Add to Chrome" + secondary "Firefox", caption "Desktop browsers. Amazon.com and Walmart.com search pages." Right: the live contact-sheet demo (below).
- **Contact-sheet demo:** a working DOM reproduction of a store-like 4 × 3 grid of authored product stills (made-up listings, labelled "Demo listings, made up for this page"), with the real overlay components (pill, rings, fold card, Proof lens) running on it. Visitors press `F` or the button "Fold twins" to see the signature moment.
- **Colour blocks:** one per story beat, full content width, lg radius, 48 px padding, twin soft tint background with matching ink text (Twin A teal block for "Same photo", Twin B amber for "Brand tax", Twin C lake for "Check the pixels"). Exactly one block per viewport, with Blush Paper between.
- **Marker circle:** the hand-drawn SVG motif circles the five twin photos in the hero once (stroke-dashoffset draw, 700 ms `--ease-scene`, after the H1 has painted; static under reduced motion).
- **Privacy diagram:** inline SVG (≤ 30 KB): your browser → store page → store image server, with the extension inside the browser box and a struck-through "our server" box labelled "doesn't exist". Text in DOM.
- **Install island:** ink background (`install-command`), copyable "Load unpacked: chrome://extensions → Developer mode → Load unpacked → .output/chrome-mv3" until store listings exist; copy button morphs to a check (150 ms, 2 px blur on the outgoing icon), "Copied" announced.
- **Footer:** licence, source, "No analytics on this page." (true only if the site ships none; the landing stage must keep it true).
- **States:** JS off: the demo renders its folded end state as static HTML. Reduced motion: demo starts folded with a "Replay fold" button that crossfades. Images loading: grid cells reserve `aspect-ratio: 1` with surface-2 fill. Copy failure: "Couldn't copy. Select the text and press Ctrl+C."

### 3D and immersive plan (bible §11): CSS/SVG and pre-rendered stills, no live WebGL
**The one sentence:** "Five listings that look different are one photo: stack them and they cancel to black."

**Decision:** no live WebGL on the landing page. The product is a DOM overlay, so the most persuasive hero is the overlay itself working on a contact sheet (bible 3P2, §11.2 principle 5: the DOM stays the source of truth). A WebGL scene would be a picture of the product instead of the product. Per 3D_INSPIRATION §5.2's decision rule, live WebGL would need a T-pattern that says something only 3D can say; the "stack and cancel" idea is fully expressed by CSS layering and `mix-blend-mode`.

**Patterns used (2):**
- **T21 Cards in space, CSS version:** in the "Check the pixels" beat, the five twin photo cards sit in a CSS `perspective: 1200px` stack (`rotateY(-18deg) translateZ(calc(var(--i) * -40px))`), slide together on a button press or when the beat scrolls into view (once), then the top card switches to `mix-blend-mode: difference` and the stack goes black. Under reduced motion: a static before/after pair.
- **T3 Product-on-surface, pre-rendered only:** the demo's product photos (one laptop-stand "factory photo" shared by the five twins, plus distractor products) are rendered offline with the studio prerender kit (`_studio/inspo/3d/prerender-kit/`), Lightformer lighting, on white like real marketplace photos. Shipped as AVIF stills ≤ 40 KB each (≤ 600 KB total, lazy below the fold). They are honest synthetic assets, labelled as demo listings.

**Pre-rendered deliverables:** hero poster (the folded state of the demo, AVIF ≤ 80 KB, the LCP candidate after the H1), README GIF and LinkedIn MP4 captured deterministically by stepping WAAPI `currentTime` with Playwright (bible §11.7 rules applied to DOM animation), OG card 1200 × 630.

**Budget:** initial JS ≤ 120 KB gz (the demo reuses the overlay components; no 3D chunk exists); CLS 0; LCP is the H1 or the poster; no canvas; no Lenis; native scroll.

### Pre-flight checklist (bible Appendix B and §11.10)
- [x] Archetype A4 Playful utility (+ A6 popup constraints) and blend notes with rejections: Overview, "Brand blend".
- [x] Direction D4 Mulberry, adjustments: `surface-3` added; pop yellow moved to `oklch(0.90 0.10 100)` after the §4.4 check (Miro ΔE 0.024 → 0.075); twin palette checked ≥ 0.06 from every blocklisted colour (Colors).
- [x] Pairing T6, scales Compact (overlay, popup) and Comfortable (options, landing), features `tnum`, `wdth`, `opsz`, `font-synthesis: none` (Typography).
- [x] Radius soft-plus 8/12/16/24, CTA grammar rect, theme default light (Shapes, Colors).
- [x] Three "we never" constraints (Overview, "We never").
- [x] Signature moments and their events: Fold twins (on `F`), Cancel to black (Difference in the Proof lens) (Components).
- [x] Shortcut map and command list, with the written cmdk deviation (Components).
- [x] Empty, loading, error and success copy for every primary surface: pill, fold card, Proof lens, popup, options, landing (Components).
- [x] Target platforms and §8 constraints: extension popup 360 × ≤ 520, shadow-DOM content UI at z 2147483647, local fonts, page colour-scheme sampling, options max 720; landing 375 / 768 / 1440 (Layout).
- [x] §11.10: the one sentence and T-patterns (T21 CSS, T3 pre-rendered) are stated above.
- [x] §11.10: poster, loop GIF/MP4 and OG card are specified with their capture method; producing them is the landing and ship stages' work, not done yet.
- [x] §11.10: size-limit entries specified (initial ≤ 120 KB; no 3D chunk because there is no WebGL; shader budget unused).
- [x] §11.10: tier 0 / reduced-motion / no-WebGL behaviour specified (no canvas exists, so tier 0 equals the default; reduced motion starts the demo folded). The screenshots that prove it are the landing stage's job.

## Do's and Don'ts

### Do:
- **Do** write "Same photo ×5" and "These 5 listings use the same photo"; show ratings and review counts under every rung so the shopper decides.
- **Do** keep one filled Berry Ink button per view, and put the keycap beside every action that has a key.
- **Do** pair every twin colour with its letter and ring pattern, and every semantic colour with an icon.
- **Do** render frequent actions (rings, popup, pill result) at 0 ms, and spend motion only on the fold and the cancel-to-black.
- **Do** use the store's own thumbnail URLs for every photo we display on the store page; never inject data URLs or our own copies.
- **Do** use one colour block per landing viewport, in a twin soft tint, with Blush Paper between blocks.

### Don't:
- **Don't** write "same item", "same product", "identical product", "dupe" or "knockoff" anywhere.
- **Don't** use Berry Ink for a ring, badge, ladder bar or price.
- **Don't** shift, restyle or reorder the store's grid before the shopper folds, and don't leave anything behind after unfold.
- **Don't** use `backdrop-filter`, gradients as decoration, uppercase eyebrows, middle-dot meta strings in UI text (draw dividers instead), emoji, or `→` appended to buttons (the pill's "→" is data: listings become products).
- **Don't** use Bricolage on the pill, rings or badges, or above weight 700.
- **Don't** show store logos or trade dress in demos, screenshots or the landing page; demo listings are made up and say so.
