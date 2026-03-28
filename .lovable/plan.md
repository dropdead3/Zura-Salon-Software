

## Remove Progress Bars, Add Revenue Share Percentage

### What changes
In `src/components/dashboard/sales/TopPerformersCard.tsx`:

1. **Remove the progress bar** (lines 209-217) — the horizontal bar relative to the #1 performer adds no actionable information.

2. **Replace with % of total revenue** — compute `totalTeamRevenue` as the sum of all performers' relevant metric, then display each performer's share as a percentage next to the service/retail split line. Example: `32.4% of total · $245.00 service · $1,348.35 retail`.

3. For retail sort mode, show `% of total retail` instead.

### Single file change
`src/components/dashboard/sales/TopPerformersCard.tsx`
- Add `totalTeamRevenue` memo summing all performers
- Remove the `<div className="h-1 ...">` progress bar block
- Insert percentage display (`XX.X%`) inline with the existing split row, or as a standalone line when no split is shown

