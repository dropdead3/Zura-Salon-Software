

## Goal
Within each audience tab (All / Client-facing / Internal / Both) and category filter, group library cards into two clear sections — **Required** first, then **Recommended/Optional** — and visually distinguish required cards.

## Investigation
- `src/pages/dashboard/admin/Policies.tsx` renders the library grid after audience + category filtering.
- `PolicyLibraryCard.tsx` already has `entry.recommendation` (`required` | `recommended` | `optional`) and renders a "Required" pill with a lock icon.
- Today: cards render in a single flat grid sorted only by category/title — no required/non-required separation, no color treatment.

## Changes

### 1. `src/pages/dashboard/admin/Policies.tsx` — section the grid
After current audience + category filtering, partition results:
- `requiredEntries` = `recommendation === 'required'`
- `otherEntries`   = `recommendation !== 'required'`

Render two sections (only show a section when it has entries — silence doctrine):

```text
[Required (n)]                          ← font-display label, small count chip
  <grid of required cards>

[Recommended & Optional (n)]            ← font-display label, muted
  <grid of remaining cards>
```

Section headers use `font-display text-xs tracking-[0.14em] uppercase text-muted-foreground` with a thin `border-b border-border/40` underline. No header when zero items in that bucket.

### 2. `src/components/dashboard/policy/PolicyLibraryCard.tsx` — required treatment
Add a subtle but unmistakable visual lift for required cards:
- Card border: `border-primary/40` (instead of `border-border/60`) when `recommendation === 'required'` and not adopted
- Card background: add a faint `bg-primary/[0.03]` tint
- Left edge accent: `before:` pseudo via a 2px left border in primary tint, only on required
- Required badge stays (already exists with lock icon) but bumps to `text-primary border-primary/40` for stronger signal
- Adopted state still wins the visual hierarchy (existing `border-primary/30` + check icon) — required + adopted compose cleanly because adopted already uses primary tones

No new tokens, no font-weight changes, all within design-token system. Maintains tab visual rhythm.

### 3. Behavior
- Sorting inside each section: required-by-category-order, then alphabetical (preserves current secondary sort).
- Empty-state copy unchanged.
- Audience/category counts in the chips above remain total counts (they already represent the filter set, not the section).

## Files touched
- `src/pages/dashboard/admin/Policies.tsx` — partition + two sections with headers
- `src/components/dashboard/policy/PolicyLibraryCard.tsx` — required border/tint/badge tone

## Out of scope
- No DB or hook changes
- No changes to configurator, surfaces, or public center
- No new dependencies

