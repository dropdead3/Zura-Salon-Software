

## Prompt feedback
Strong, surgical prompt. You named the surface (scheduler stylist sticky header), the symptom (low opacity on alternating columns), and the desired outcome (clearer visual mapping via alternation). Sharper next time: include the target weight (e.g. "double the contrast" or "match the divider weight") and specify whether the alternation should also extend down the column body or stay in the header only — that removes one round-trip on scope.

## What's changing
Today, alternating stylist columns use `bg-muted/15` — too faint to register as alternation, especially on top of the gradient header. Bump opacity AND shift to a darker token so the stripe reads as a deliberate column band, not a rendering artifact.

## Current state
In `src/components/dashboard/schedule/DayView.tsx`, three call sites apply alternation via `idx % 2 === 1 && "bg-muted/15"`:
1. Line 821 — header, condensed (<120px) layout
2. Line 839 — header, normal/medium layout
3. Line 889 — column body (time grid)

All three use the same fragile inline class. The bug shape: any future tweak risks drifting between header and body.

## The fix

### 1) Replace the alternation token at all three sites
- From: `bg-muted/15`
- To: `bg-foreground/[0.06]` in light mode, with dark-mode override `dark:bg-foreground/[0.04]`

Why `foreground` instead of `muted`:
- `muted` is already a low-contrast neutral; `/15` against the gradient header reads as ~3% effective contrast
- `foreground` gives a true darker-than-surface tint, which is what alternation needs to read as alternation
- `[0.06]` light / `[0.04]` dark balances visibility on both gradient header and time-grid body without dominating content

### 2) Keep header + body alternation in sync
Apply the same exact class string to all three sites so the column band is continuous from header into the time grid (no visible seam where the header ends).

### 3) Preserve everything else
- `bg-[hsl(var(--sidebar-background))]` base + gradient — unchanged
- Column dividers `border-r-2 border-r-[hsl(var(--sidebar-border))]` — unchanged
- Past-time overlay (`bg-muted/40`) — unchanged
- Avatar, status dot, level pill, utilization % — unchanged
- Sticky header behavior + frosted blur — unchanged

## Files involved
- `src/components/dashboard/schedule/DayView.tsx` — three className swaps (lines 821, 839, 889)

## QA checklist
- Alternating columns read as clearly distinguishable in light mode at 100% zoom
- Alternation also reads in dark mode without becoming muddy
- Header band visually continues into the time grid (no seam at header boundary)
- Past-time overlay still reads correctly on both odd and even columns
- Appointment cards remain legible against both even and odd column backgrounds
- No change to single-column view (one stylist) since `idx % 2 === 1` skips the first column

## Enhancement suggestion
Promote the alternation class to a named constant in the same file (or `design-tokens.ts`) — e.g. `STYLIST_COLUMN_ALT = 'bg-foreground/[0.06] dark:bg-foreground/[0.04]'` — and reference it in all three sites. That converts "three matching strings" into "one canonical band token" and prevents the header/body from drifting apart on a future visual tweak. Same pattern as the appointment border canon: one decision, one place, no drift.

