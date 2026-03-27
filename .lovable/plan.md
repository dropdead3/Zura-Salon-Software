

## Change KPI Strip to 3×2 Responsive Grid

### Problem
The 6 KPI tiles are cramped in a single row on desktop. The data doesn't breathe — labels wrap and values are hard to scan.

### Change

**File: `src/components/dashboard/color-bar-settings/ColorBarDashboardOverview.tsx`**

**Line 148** — Replace the grid class from the current single-row layout:

```
// Before
grid-cols-2 sm:grid-cols-3 lg:grid-cols-6  (or lg:grid-cols-5)

// After
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

This gives a **3×2 grid** on desktop, **2×3 on tablet**, and **1-column stack on mobile** — more room for each tile to display its label, value, and subtitle without cramping.

The conditional logic for `supplyCostRecoveryEnabled` (5 vs 6 columns) is no longer needed since 3 columns handles both 5 and 6 tiles gracefully (5 tiles = 3+2 rows, 6 tiles = 3+3 rows).

### Result
Each KPI tile gets ~3× the horizontal space, making labels, values, and subtitles comfortably readable. The 2-row layout also better matches the visual hierarchy — KPIs as a prominent section rather than a compressed strip.

