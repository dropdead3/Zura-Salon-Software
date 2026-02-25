

## Fix: Revenue Breakdown Donut Chart Colors

The screenshot shows the donut chart using white for Services and green (`chart-2`) for Retail. The user wants to replace green with the theme's `oat` color, and keep Services as white (foreground).

### Changes

**File: `src/components/dashboard/sales/RevenueDonutChart.tsx`**

1. **Line 34**: Change Services color from `hsl(var(--primary))` to `hsl(var(--foreground))` (white in dark mode)
2. **Line 35**: Change Retail color from `hsl(var(--chart-2))` to `hsl(var(--oat))` (warm neutral that adapts per theme)
3. **Line 110**: Change Services legend dot from `bg-primary` to `bg-foreground`
4. **Line 117**: Change Retail legend dot from `bg-chart-2` to `bg-oat`

### What stays the same

- Card header layout, icon, title, filter badge — all correct
- Donut geometry (inner/outer radius, paddingAngle, stroke)
- Tooltip styling, Retail % and Attach Rate metrics below

### Scope

4 color class/value changes in 1 file. No structural changes.

