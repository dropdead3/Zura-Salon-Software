

## Improve Progress Bar: Earned % + Projected Finish

### Problem
The progress bar currently just shows "Actual Revenue: $1,905.87" with a bar — it doesn't tell the operator what percentage of today's scheduled appointments have been earned, or where the day is heading.

### Solution
Replace the progress bar label and add a projection line:

1. **Bar label**: Change from "Actual Revenue → $1,905.87" to **"Earned X% of scheduled services today"** where X = `(todayActual.actualRevenue / displayExpected) * 100`. Keep the dollar amount right-aligned.

2. **Projection line**: Below the bar, replace the "Exceeded" badges with: **"On track to finish at $Y service revenue"** — calculated as:
   - If pending appointments remain: `completedActualRevenue + pendingScheduledRevenue` (what's already collected + what's still on the books)
   - If all appointments complete: show "Final: $X" instead of a projection

3. **Exceeded state**: If actual already exceeds scheduled, the bar fills to 100% with success color, and the projection line says "Exceeded scheduled by $Z"

### Changes in `AggregateSalesCard.tsx` (lines ~897-938)

- Replace "Actual Revenue" label with "Earned X% of scheduled services" (left) + formatted amount (right)
- Replace "Exceeded" / "All appointments complete" badges below the bar with a single projection line: "On track to finish at $Y service revenue" using `adjustedExpected.adjustedExpected` (actual completed + pending scheduled)
- Keep the estimated final transaction time line below

### File
- `src/components/dashboard/AggregateSalesCard.tsx`

