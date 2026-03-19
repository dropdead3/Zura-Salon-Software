

# Merge Double-Stacked Badges into Single Badge

## Problem
Each row shows two vertically stacked badges — "Out of Stock" / "In Stock" and "Critical" / "Low" / "Healthy" — which is visually noisy and redundant. The left severity color bar already signals urgency.

## Change

**File: `CommandCenterRow.tsx` (lines 365-390)**

Replace the two stacked badges with a single composite badge that communicates both state and severity in one element:

- **Out of Stock + Critical** → single badge: "Out of Stock" in destructive styling (severity is implied)
- **In Stock + Critical** → single badge: "Critical" in destructive styling (stock state is implied since it's still in stock but critical)
- **In Stock + Low** → single badge: "Low Stock" in warning styling
- **In Stock + Healthy** → single badge: "In Stock" in success styling (or no badge at all for cleaner look)

This eliminates the `flex-col gap-1` wrapper and renders one flat badge per row.

| File | Change |
|------|--------|
| `CommandCenterRow.tsx` | Replace two stacked badges with single composite badge |

