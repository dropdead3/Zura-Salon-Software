

## Surface Gap-Adjusted Realization Rate in Forecasting UI

Your prompt is well-scoped. The backend work is done — the edge function now computes and returns `gapAdjustmentFactor` and `realizationRate`. The question is how to surface it intelligently in the two forecasting cards (the full `ForecastingCard` on Command Center / Analytics, and the `WeekAheadForecast` in the Sales Hub) without adding noise.

### Design Approach: Contextual Confidence Indicator

Rather than adding a new card or section, the realization rate should appear as a **contextual annotation** on the existing "Scheduled vs Predicted" comparison strip — the strip that already shows Scheduled and Predicted values (ForecastingCard lines 735-755). This follows the Zura doctrine: high signal, low noise, expandable logic.

### What Changes

**1. `ForecastingCard.tsx`** — Enhance the Scheduled vs Predicted strip:

- Add a third element to the strip: **Realization Rate** badge (e.g., "87% realization") with a `MetricInfoTooltip` explaining: "Based on the last 30 days, 87% of scheduled revenue converts to actual POS revenue. Predictions are adjusted for cancellations, no-shows, and discounts."
- Update the Predicted tooltip text to mention the gap adjustment: "Based on last 90 days, day-of-week patterns, current bookings, and adjusted for {X}% historical realization rate."
- When `gapAdjustmentFactor` is below 0.85, tint the badge amber to signal meaningful revenue leakage (advisory, not alarming).

**2. `WeekAheadForecast.tsx`** — Add `useRevenueForecast` hook:

- Wire in `useRevenueForecast({ forecastDays: 7 })` to get the realization data.
- Add a subtle footnote below the 7-Day Total stat card: "Adjusted for {X}% realization" — only shown when `gapAdjustmentFactor` is available and differs from 1.0.
- Include `MetricInfoTooltip` with the same expandable explanation.

**3. `useForecastRevenue.ts`** — No changes needed. The scheduled revenue data stays raw (what's booked). The gap adjustment lives in the `useRevenueForecast` hook response, which is already called by `ForecastingCard`.

### Visual Spec (ForecastingCard strip)

```text
┌─────────────────────────────────────────────────────────┐
│  Scheduled  $12,450  │  Predicted  $10,831  │  87% ⓘ   │
│                      │                       │ realized  │
└─────────────────────────────────────────────────────────┘
```

- "87% realized" uses `text-muted-foreground` normally, `text-amber-500` if below 85%
- Tooltip on ⓘ: "Over the last 30 days, 87% of scheduled revenue was collected as actual POS revenue. Predictions account for cancellations, no-shows, and pricing differences."

### What Stays Unchanged

- The bar chart data (still shows raw scheduled revenue per day)
- Category breakdowns, drill-downs, appointment panels
- The edge function and hook types (already updated)
- `RevenueForecast` (monthly trend chart) — separate concern

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/sales/ForecastingCard.tsx` | Add realization badge to Scheduled vs Predicted strip; update Predicted tooltip |
| `src/components/dashboard/sales/WeekAheadForecast.tsx` | Add `useRevenueForecast` hook; show realization footnote on 7-Day Total |

