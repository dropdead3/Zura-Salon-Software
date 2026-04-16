

# Alternating Column Colors & Thicker Dividers

## Problem
With many stylists, it's hard to visually track which column belongs to which stylist. The thin `border-r` dividers blend together.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Thicker divider lines between columns
Replace the thin `border-r` on both header cells and grid columns with a 2px border using `border-r-2 border-r-border/60`.

**Header cells (lines ~588, ~607):** Change `border-r border-[hsl(var(--sidebar-border))]` → `border-r-2 border-r-border/50`

**Grid columns (line ~656):** Change `border-r last:border-r-0` → `border-r-2 border-r-border/40 last:border-r-0`

### 2. Alternating column background colors
Pass the stylist index into both the header and grid column rendering. Apply a subtle alternating background:

- **Even columns**: No extra class (default transparent)
- **Odd columns**: `bg-muted/20` (very subtle darker tint)

This uses the existing semantic `muted` color which adapts to dark/light themes.

**Header cells:** Add `idx % 2 === 1 ? 'bg-muted/15' : ''` to the className.

**Grid columns:** Add `idx % 2 === 1 ? 'bg-muted/[0.08]' : ''` to the column wrapper. Keep it very low opacity so it doesn't interfere with appointment card colors or the outside-hours shading.

### 3. Implementation detail
- Use `.map((stylist, idx) => ...)` — the index is already available or easily added in both loops
- The alternating stripe carries through from header to grid body, creating a clear visual lane
- No new dependencies

Single file change.

