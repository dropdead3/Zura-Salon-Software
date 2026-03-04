

## Problem

The "Predicted" toggle is always disabled because `hasRealization` is false. This happens because:

1. `useRevenueForecast` calls the `revenue-forecasting` edge function
2. That edge function call is failing silently (no network request visible in logs)
3. When `predictedData` is `undefined`, `realizationRate` is `undefined`, so `hasRealization` evaluates to `false`
4. The toggle is disabled with "Insufficient historical data" tooltip

The edge function is a heavyweight call (fetches 90 days of sales, all appointments, optionally calls AI). It's fragile and overkill when all we need is the realization rate number.

## Fix

Create a lightweight `useRealizationRate` hook that computes the 30-day realization rate directly via two simple database queries (same logic the edge function uses), and use it instead of depending on the full edge function response.

### New hook: `src/hooks/useRealizationRate.ts`

- Query `phorest_appointments` for the last 30 days (scheduled totals by date)
- Query `phorest_daily_sales_summary` for the last 30 days (actual totals by date)
- Compute daily ratios (actual / scheduled) for days where both exist
- Average the ratios, clamp to [0.70, 1.00], multiply by 100 to get integer percentage
- Return `{ realizationRate, dataPoints, isLoading }`
- Respect location filter and organization scope

### Update `ForecastingCard.tsx`

- Import and use `useRealizationRate` instead of deriving from `predictedData`
- Pass `selectedLocation` to the hook
- Remove the `useRevenueForecast` dependency for this purpose (keep it if used elsewhere)
- The toggle logic (`hasRealization`, `realizationFactor`, `isPredictedMode`) stays the same

### Update `WeekAheadForecast.tsx`

- Same pattern: use `useRealizationRate` instead of `predictedData?.realizationRate`

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useRealizationRate.ts` | New hook -- lightweight 30-day realization rate query |
| `src/components/dashboard/sales/ForecastingCard.tsx` | Use `useRealizationRate` instead of edge function data |
| `src/components/dashboard/sales/WeekAheadForecast.tsx` | Use `useRealizationRate` instead of edge function data |

