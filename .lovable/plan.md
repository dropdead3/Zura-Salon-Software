

## Surface Realization-Adjusted Revenue Toggle in Forecasting Card

### Problem

The realization rate UI elements (badge, callout, predicted strip) are conditionally rendered only when `predictedData` from `useRevenueForecast` is available. That hook calls the `revenue-forecasting` edge function, which appears to not be returning data in this environment — so nothing renders. More importantly, even when it works, the realization data is buried in a small annotation strip. You want to **see and toggle** between scheduled (raw bookings) and predicted (realization-adjusted) revenue directly in the stat cards and chart.

### Approach

Rather than depending on a separate edge function call that may fail silently, **derive the predicted values client-side** from the scheduled data that's already loaded (`useForecastRevenue`) plus the realization rate from `useRevenueForecast`. Add a **Scheduled / Predicted toggle** to the stat card area so the user can switch views.

### Changes

**1. `ForecastingCard.tsx` — Add Scheduled/Predicted toggle**

- Add a `viewMode` state: `'scheduled' | 'predicted'`
- Below the period tabs (or inline with stat cards), render a small toggle: `Scheduled | Predicted`
- When `predicted` is active and `realizationRate` is available:
  - Stat cards show `totalRevenue * (realizationRate / 100)` instead of raw `totalRevenue`
  - Daily average adjusts proportionally
  - The "Scheduled" strip updates label to show both raw and adjusted
  - Bar chart values multiply by the realization factor
- When `realizationRate` is unavailable, the `Predicted` toggle option shows as disabled with a tooltip: "Insufficient historical data to calculate realization rate"
- Show the realization rate as a small annotation below the toggle (e.g., "87% realization rate applied")
- Keep the `FirstTimeCallout` and `MetricInfoTooltip` as-is for education

**2. `ForecastingCard.tsx` — Fallback when edge function is unavailable**

- Make the strip always show "Scheduled" with the raw value (already works)
- When `predictedData` loads, enable the Predicted toggle and show the strip annotation
- If `predictedData` is null/loading, gracefully fall back to scheduled-only mode (current behavior, but now explicit)

**3. `WeekAheadForecast.tsx` — Same toggle pattern**

- Add a smaller `Scheduled | Predicted` toggle to the 7-Day Total stat card
- When toggled to Predicted, multiply the total and daily values by `realizationRate / 100`
- Show footnote with realization percentage

### Visual Spec

```text
┌──────────────────────────────────────────────┐
│  [Scheduled]  [Predicted]                    │
│  87% realization rate applied ⓘ              │
├──────────────────────────────────────────────┤
│  $15,880.11    $3,176.02      150            │
│  7-Day Total   Daily Avg      Appointments   │
└──────────────────────────────────────────────┘
```

When in Scheduled mode (default), values show raw booked amounts as today. When in Predicted mode, values are multiplied by the realization factor and labeled accordingly.

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/sales/ForecastingCard.tsx` | Add `viewMode` toggle, adjust stat card values, update strip, fallback handling |
| `src/components/dashboard/sales/WeekAheadForecast.tsx` | Add smaller toggle, adjust 7-Day Total display |

