

## Fix: Realization Rate Display Bug

The realization rate UI is present in both cards but never renders because of a **data format mismatch** between the edge function and the UI components.

### Root Cause

The `revenue-forecasting` edge function returns:
- `realizationRate`: integer percentage (e.g., `87`)
- `gapAdjustmentFactor`: decimal (e.g., `0.870`)

The UI code compares `realizationRate < 1.0` (always false when value is 87) and displays `Math.round(realizationRate * 100)` which would produce `8700%`.

### Fix

**`ForecastingCard.tsx`** — Update all `realizationRate` references:
- Change condition from `realizationRate < 1.0` to `realizationRate < 100`
- Change threshold from `realizationRate < 0.85` to `realizationRate < 85`
- Display `realizationRate` directly (already a percentage) instead of `Math.round(realizationRate * 100)`
- Same changes for the FirstTimeCallout, Predicted tooltip, and realized badge

**`WeekAheadForecast.tsx`** — Same pattern:
- Change condition from `realizationRate < 1.0` to `realizationRate < 100`
- Change threshold from `realizationRate < 0.85` to `realizationRate < 85`
- Display `realizationRate` directly instead of `Math.round(realizationRate * 100)`

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/sales/ForecastingCard.tsx` | Fix percentage comparisons and display formatting |
| `src/components/dashboard/sales/WeekAheadForecast.tsx` | Fix percentage comparisons and display formatting |

