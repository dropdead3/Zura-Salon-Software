

## Change Retail color to light gray

**File: `src/components/dashboard/sales/RevenueDonutChart.tsx`**

Two changes:

1. **Donut segment color** (line 37): Change `'hsla(35, 70%, 45%, 0.55)'` to `'hsl(var(--muted-foreground) / 0.4)'` — a subtle light gray that works in both light and dark mode.

2. **Legend indicator dot** (line 109): Change the inline `backgroundColor: 'hsla(35, 70%, 45%, 0.55)'` to match the same gray value.

This replaces the amber-orange retail color with a muted gray, keeping the foreground (Services) as the dominant visual element.

