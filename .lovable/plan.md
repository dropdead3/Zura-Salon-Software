

## Clarify Expected Badge: Service Revenue Focus

### Problem
The "More Expected Today" badge is ambiguous — it shows a remaining total but doesn't clarify what was originally scheduled, what's been collected in services, and whether the day is tracking ahead or behind on service revenue specifically.

### Solution
Restructure the Expected badge area to show three clear data points focused on **service revenue**:

1. **Scheduled Services Today**: The original total of all service appointments booked (from `originalExpected` in the adjusted hook — appointment prices are service prices)
2. **Remaining badge**: Show `pendingScheduledRevenue` as "More Service Revenue Expected" — this is the sum of appointments not yet completed
3. **Shortfall/Surplus indicator**: Compare `completedActualRevenue` (what completed appointments actually brought in) against what those same completed appointments were originally scheduled for. If actual < scheduled for completed appointments, show a shortfall warning like "Tracking $X below scheduled"

### Changes

#### `src/hooks/useAdjustedExpectedRevenue.ts`
- Add `completedScheduledRevenue` to the return — the sum of `total_price` for completed appointments (so we can compare scheduled vs actual for resolved appointments)
- This enables: shortfall = `completedScheduledRevenue - completedActualRevenue`

#### `src/components/dashboard/AggregateSalesCard.tsx` (lines ~808-857)
- Replace the single badge with a small stacked info block:
  - Line 1: "Scheduled Services Today: $X" (muted, using `originalExpected` minus cancelled/no-show scheduled — i.e. `adjustedExpected.adjustedExpected`)
  - Line 2: Badge showing `pendingScheduledRevenue` → "$Y More Service Revenue Expected" (with pending count)
  - Line 3 (conditional): If `completedActualRevenue < completedScheduledRevenue`, show a subtle shortfall indicator: "Tracking $Z below scheduled" in destructive/warning color. If ahead, show "Tracking $Z above scheduled" in success color.
- Update the info tooltip to explain: "Service revenue from today's appointments. Completed appointments use actual POS totals; pending appointments use their scheduled price. Cancellations and no-shows are excluded."
- Keep the click-to-drilldown behavior for Gap Report

### What stays the same
- Progress bar logic unchanged
- Gap analysis drilldown unchanged
- The hero "Revenue So Far Today" number remains total POS revenue (services + retail)

