

# Fix Display Tab — Text Sizing & Card Title Tokens

## Problem
The three sub-cards (Live Configuration, S710 Specs, Checkout Experience) use raw `text-[9px]` and `text-[10px]` classes for titles and body text — too small and not following design tokens. Sub-card titles should use `tokens.heading.subsection` and body text should use `tokens.body.muted`.

## Changes

### `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

**Sub-card titles** (lines 91, 130, 143) — currently `text-[9px] ... uppercase font-sans`:
- Replace with `tokens.heading.subsection` (`font-display text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.15em]`)

**Body/description text** (lines 93-94, 145-146) — currently `text-[10px]` or `text-xs`:
- Replace with `tokens.body.muted` (`font-sans text-sm text-muted-foreground`)

**Data values** (lines 107-112, 121, 134) — currently `text-[10px] font-mono`:
- Bump to `text-xs font-mono` for readability

**Config labels** (lines 105, 119, 133) — currently bare `text-muted-foreground font-sans`:
- Use `tokens.body.muted` for consistency

**Feature pills** (lines 156-159) — currently `text-[9px]`:
- Bump to `text-xs`

**Auto-play button** (line 78) — currently `text-[10px]`:
- Bump to `text-xs`

No structural changes — just token alignment and minimum text sizing from `text-[9px]`/`text-[10px]` up to `text-xs`/`text-sm`.

