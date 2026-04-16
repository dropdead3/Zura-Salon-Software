

# Fix Column Dividers & Alternating Background Colors

## Problem
1. Divider lines use `border-r-border/40` and `border-r-border/50` which are too transparent and blend into the dark background.
2. Grid body alternating columns use `bg-muted/[0.08]` which doesn't match the header's `bg-muted/15` — the stripe "lanes" break visually between header and body.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Increase divider opacity
- **Header cells** (lines 588, 607): `border-r-border/50` → `border-r-[hsl(var(--sidebar-border))]` (full opacity sidebar border color, consistent with the schedule aesthetic)
- **Grid columns** (line 656): `border-r-border/40` → `border-r-[hsl(var(--sidebar-border))]`

### 2. Match alternating column backgrounds
- **Grid columns** (line 656): `bg-muted/[0.08]` → `bg-muted/15` to match the header row's alternating tint
- Both header and grid body odd columns will now share `bg-muted/15`

### Result
- Dividers become clearly visible against the dark schedule background
- Alternating column stripes carry through seamlessly from header to grid body

Single file, 3 line changes.

