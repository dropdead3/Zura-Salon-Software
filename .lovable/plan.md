

## Fix: Retail Donut Segment — Translucent Amber-Orange Fill

The reference screenshot shows a warm, translucent amber-orange (approximately `hsla(35, 70%, 45%, 0.55)` — a rich amber with ~55% opacity). This replaces the current `oat` token which was too muted/brown.

### Changes

**File: `src/components/dashboard/sales/RevenueDonutChart.tsx`**

1. **Line 35**: Change Retail color from `hsl(var(--oat))` to `hsla(35, 70%, 45%, 0.55)` — translucent amber-orange matching the Super Admin badge reference
2. **Line ~117**: Change Retail legend dot from `bg-oat` to a custom inline style or utility class `bg-amber-600/55` to match

### Scope

2 color changes in 1 file. No structural changes.

