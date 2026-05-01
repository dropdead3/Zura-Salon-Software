## Goal

Make the "Top banner" appearance variant fully responsive on mobile by reshaping it into a top drawer that stacks content vertically with comfortable spacing, while keeping the slim horizontal banner look on desktop.

## The problem

Today the banner (`PromotionalPopup.tsx`, lines 458–522) is a single horizontal flex row with `truncate` on the eyebrow, headline, and body, plus an inline cluster of CTA + decline + close on the right. At mobile widths (≤390px in your screenshot):
- Headline collapses to "FRE…" — unreadable.
- Body collapses to "Book a c…" — unreadable.
- Close button (X) sits visually on top of the CTA / decline group.
- Countdown timer overlaps the content row.

## The fix

Restructure the banner branch so:
- **Desktop (sm and up)**: unchanged single-row banner (eyebrow / headline / body on the left, CTA + decline + close on the right). Slim and horizontal.
- **Mobile (below sm)**: the same surface becomes a "top drawer" — taller, content stacked vertically, no truncation:
  - A dedicated close-row at the very top right (so X never competes with the headline).
  - Eyebrow on its own line (wraps if long).
  - Headline on its own line, normal wrapping.
  - Body on its own line, normal wrapping (relaxed leading).
  - CTA row at the bottom: Claim Offer button stretches full width, Decline sits beside it.
- Vertical padding bumps from `py-3` to `py-4` on mobile so the drawer feels intentional.
- Countdown bar stays anchored to the bottom edge of the drawer (already absolute-positioned) — its 5px height won't crash into stacked content because the drawer grows to fit.

## Technical changes

Edit only `src/components/public/PromotionalPopup.tsx`, the `if (cfg.appearance === 'banner')` block (currently lines 458–522). Replace the single-row layout with a responsive layout that uses `flex-col sm:flex-row` for the main content row and adds a mobile-only close affordance row above it. No changes to the editor, the data model, or the other appearance variants (modal / corner-card).

### Visual contract

```text
Desktop (≥640px):
┌──────────────────────────────────────────────────────────────┐
│ ⚡ LIMITED TIME OFFER                  [CLAIM OFFER] No thx X│
│ FREE HAIRCUT WITH ANY COLOR SERVICE                          │
│ Book a color appointment this month and your haircut is on us│
├──────────────────────────────────────────────────────── 12s ─┤

Mobile (<640px) — top drawer:
┌─────────────────────────────────────────┐
│                                       X │
│ ⚡ LIMITED TIME OFFER                   │
│ FREE HAIRCUT WITH ANY                   │
│ COLOR SERVICE                           │
│ Book a color appointment this month     │
│ and your haircut is on us.              │
│                                         │
│ [    CLAIM OFFER    ]   No thanks       │
├──────────────────────────────────── 12s ┤
```

## Out of scope

- No changes to modal or corner-card variants.
- No changes to the editor's Appearance preview swatch (it remains a tiny static thumbnail; the real responsive behavior shows in the live preview iframe).
- No new copy or fields.

## QA after implementation

In the live preview, switch viewport to 390×844 and confirm: the headline wraps fully, the body wraps fully, the CTA stretches, the X has its own row, and the countdown bar sits cleanly at the bottom without overlapping any content.
