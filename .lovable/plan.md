

## Gap-Adjusted Revenue Forecasting

Strong prompt — you're identifying that the current forecasting engine uses raw historical averages and booked appointments, but ignores the systematic gap between what's scheduled and what's actually collected (cancellations, no-shows, discounts, pricing diffs). A 30-day rolling gap ratio would calibrate predictions much closer to reality.

### How It Works Today

The `revenue-forecasting` edge function:
1. Fetches 90 days of `phorest_daily_sales_summary` (actual POS revenue)
2. Groups by day-of-week to get averages
3. Checks booked appointments for upcoming days
4. Picks `max(booked, historical_avg)` as the prediction
5. Optionally sends context to AI for enhanced forecasting

**Problem**: When there's $5,000 booked for a day but historically only ~85% converts to actual POS revenue (due to cancellations, no-shows, discounts), the forecast over-predicts. The gap is systematic and measurable.

### What Changes

**`supabase/functions/revenue-forecasting/index.ts`** — Add a 30-day gap ratio calculation:

1. **Fetch 30-day scheduled vs actual data**: Query `phorest_appointments` (all statuses) for total scheduled value, and `phorest_daily_sales_summary` for actual collected revenue, over the last 30 days
2. **Compute daily gap ratios**: For each day with both scheduled and actual data, calculate `actual / scheduled` — this is the "realization rate" (e.g., 0.87 means 87% of scheduled revenue is actually collected)
3. **Calculate rolling average**: Average the daily ratios to get a single `gapAdjustmentFactor` (floored at 0.70, capped at 1.0 to prevent wild swings)
4. **Apply to forecasts**: Multiply booked revenue by `gapAdjustmentFactor` before comparing to the historical average. The fallback forecast becomes `max(bookedRevenue * gapFactor, historicalAvg)` instead of `max(bookedRevenue, historicalAvg)`
5. **Include in AI context**: Pass the gap factor and its components to the AI prompt so it can reason about realization rates
6. **Surface the factor**: Include `gapAdjustmentFactor` and `realizationRate` in the response so the UI can display "adjusted for 87% historical realization"

**`src/hooks/useRevenueForecast.ts`** — Extend `RevenueForecastResponse` type to include the new `gapAdjustmentFactor` field from the response.

### Concrete Logic (Edge Function)

```text
30-day window:
  For each day in [today - 30, yesterday]:
    scheduled[day] = SUM(phorest_appointments.total_price) WHERE date = day
    actual[day]    = phorest_daily_sales_summary.total_revenue WHERE date = day

  ratios = actual[day] / scheduled[day]  (only days where scheduled > 0)
  gapFactor = AVG(ratios), clamped to [0.70, 1.00]

Forecast adjustment:
  adjustedBooked = bookedRevenue * gapFactor
  predicted = MAX(adjustedBooked, historicalDowAvg)
```

### What Stays Unchanged

- Gap analysis drilldown (RevenueGapDrilldown) — that's retrospective analysis, separate concern
- Growth forecasting (quarterly/monthly) — different time horizon
- Historical benchmarks — different purpose
- All UI components — the forecast hook already renders whatever the edge function returns

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/revenue-forecasting/index.ts` | Add 30-day gap ratio query, apply to forecast logic, include in AI context |
| `src/hooks/useRevenueForecast.ts` | Add `gapAdjustmentFactor` to response type |

