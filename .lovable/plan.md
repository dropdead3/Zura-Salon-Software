

# Decision Header → Action Bar

## Problem
The decision header looks like a card/block element. The user wants it to feel like the `ScheduleActionBar` — a single-line rounded pill bar with `backdrop-blur`, `shadow-lg`, inline layout.

## Change

**File: `StockTab.tsx` (lines 330-385)**

Replace the current block layout with a pill-bar style matching `ScheduleActionBar`:

- Container: `bg-card/80 backdrop-blur-xl border border-border rounded-full px-4 py-2.5 flex items-center gap-3 shadow-lg`
- Remove the left accent bar (`span` with `w-0.5 bg-destructive/60`)
- Flatten to a single horizontal row:
  - Left: count + "Items Need Action" inline (single line, not stacked)
  - Center: severity breakdown inline (`191 Critical · 0 Low · Est. PO: $19.60`)
  - Right: buttons inline
- "All clear" state also gets the bar treatment (matching the schedule bar's empty state pattern)

This mirrors `ScheduleActionBar`'s exact visual pattern: `rounded-full`, `bg-card/80 backdrop-blur-xl`, `shadow-lg`, single-line horizontal layout.

| File | Change |
|------|--------|
| `StockTab.tsx` | Restyle decision header to pill-bar layout |

