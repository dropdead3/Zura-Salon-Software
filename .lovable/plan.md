

## Fix: Avg Tip Rate Using Wrong Revenue Denominator on "Today" View

### Root Cause

The "Avg Tip Rate" on the Tips sidebar card (line 1091 of `AggregateSalesCard.tsx`) always divides tips by `displayMetrics.totalRevenue`, which for the "Today" view is the **expected/scheduled** revenue ($1,640) rather than the **actual** completed revenue ($1,035).

Current calculation: $331 / $1,640 = 20.2% (wrong)
Correct calculation: $331 / $1,035 = 32.0% (right)

Every other metric in the card already handles this distinction -- the hero number, the service/product breakdown, and the revenue donut all switch to `todayActual.actualRevenue` when in the Today view. The tip rate calculation was simply missed.

### Fix

**File:** `src/components/dashboard/AggregateSalesCard.tsx` (line ~1090)

Change the denominator from `displayMetrics.totalRevenue` to use actual revenue when available:

```text
Before:
  displayMetrics.totalRevenue > 0
    ? ((tips / displayMetrics.totalRevenue) * 100).toFixed(1)

After:
  // Use actual revenue on Today view, expected otherwise
  const tipDenominator = isToday && todayActual?.hasActualData
    ? todayActual.actualRevenue
    : displayMetrics.totalRevenue;

  tipDenominator > 0
    ? ((tips / tipDenominator) * 100).toFixed(1)
```

This follows the exact same pattern already used for the service/product breakdown (lines 739-741) and the hero metric (line 605).

### Scope

Single file, single calculation. No hook changes needed -- the data is already available via `todayActual`.

