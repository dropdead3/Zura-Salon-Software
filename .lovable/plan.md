

# Clean Up Today Hero Section — Remove Redundancy & Improve Toggle Visibility

## Problem
The Today hero section has significant information overlap between the compact summary line and the expanded detail section:
1. **Double progress bar** — thin bar above compact summary + thicker bar inside expanded section
2. **Repeated appointment counts** — "33/36 appts" in compact, then "33 of 36 appointments completed · 3 pending" in expanded
3. **Repeated remaining/exceeded info** — compact line shows "remaining" or "exceeded," then expanded repeats via badge + progress label
4. **Nearly invisible toggle** — the expand/collapse trigger is tiny muted text with a 3px chevron, easy to miss

## Approach

Restructure into two clear layers: **always-visible essentials** and **expandable operational detail**, with no overlap between them.

### Always visible (collapsed state)
- Hero revenue number (unchanged)
- Label + tax/tip disclaimer (unchanged)
- Single progress bar (h-1.5) showing earned % of scheduled
- A styled **summary button** replacing the current tiny text — pill-shaped, visible border, with chevron icon and a clear label like "33/36 appts · $387 remaining ▾"

### Expanded detail (on click)
- Scheduled Services Today total (with info tooltip)
- Appointment breakdown (pending, awaiting checkout, discounts)
- Remaining revenue badge (only if > 0)
- Exceeded/on-track status message
- Estimated final transaction time
- Gap analysis trigger

### What gets removed/deduplicated
- Remove the **top thin progress bar** (lines 861-867) — keep only the one inside expanded
- Actually, reverse: keep the always-visible bar, remove the expanded one (lines 964-971) since the compact bar already shows the same data
- Remove redundant "Earned X% of scheduled services today" label from expanded — the bar + compact summary already convey this
- Remove the "All appointments complete" duplicate at lines 997-1001 — already shown in compact summary or exceeded message

## File Changes

### `src/components/dashboard/AggregateSalesCard.tsx`

1. **Restyle the toggle button** (lines 869-881): Replace the barely-visible text+chevron with a bordered pill button:
   - `border border-border/60 rounded-full px-3 py-1.5 hover:bg-muted/50` 
   - Slightly larger text (`text-xs` → keep but add `text-muted-foreground` not `/70`)
   - Larger chevron (`w-3.5 h-3.5`)

2. **Remove duplicate progress bar** from expanded section (lines 953-994): Remove the "Earned X% of scheduled services today" block with its second progress bar and the exceeded/on-track message. Keep the always-visible progress bar above the toggle.

3. **Remove duplicate "All appointments complete"** (lines 997-1001): This is redundant with the compact summary which already says "All complete".

4. **Keep in expanded section**: Scheduled Services total, appointment breakdown counts, remaining revenue badge (contextual), estimated final time, gap analysis trigger.

Single file change, ~40 lines removed/modified.

