

## Rename Forecasting Total Labels to "Next X" and Make Tooltips Dynamic

### Problem
The total label inside the Forecasting card says "7-Day Total" (or "30-Day Total", etc.) but should say **"Next 7-Day Total"** to clarify it's forward-looking. The tooltip should also dynamically reflect the selected time range with "over the next X days" language.

### Changes

**File: `src/components/dashboard/sales/ForecastingCard.tsx`**

1. Update `PERIOD_TOTAL_LABELS` to prefix with "Next":
   - `'tomorrow'` → `'Tomorrow Total'` (unchanged — already clear)
   - `'todayToEom'` → `'Rest of Month Total'`
   - `'7days'` → `'Next 7-Day Total'`
   - `'30days'` → `'Next 30-Day Total'`
   - `'60days'` → `'Next 60-Day Total'`

2. Update `PERIOD_DESCRIPTIONS` and the inline `totalTooltip` (~line 617) to use "over the next" phrasing dynamically:
   - Scheduled mode: `"Sum of projected revenue from all scheduled appointments over the next {period label}."`
   - Predicted mode: keep the realization rate explanation as-is

3. Update `avgTooltip` references that use `PERIOD_TOTAL_LABELS` to stay consistent with the new names.

**File: `src/components/dashboard/sales/WeekAheadForecast.tsx`**

4. Update the hardcoded `'7-Day Total'` (line 422) → `'Next 7-Day Total'`
5. Update the hardcoded `'7-Day Predicted'` → `'Next 7-Day Predicted'`
6. Update the tooltip description (line 426) from `"over the 7 days"` → `"over the next 7 days"`

### Files modified
- `src/components/dashboard/sales/ForecastingCard.tsx`
- `src/components/dashboard/sales/WeekAheadForecast.tsx`

