

## Make Forecast Bar Labels More Accurate

The `AboveBarLabel` component in `WeekAheadForecast.tsx` (line 64) currently formats all values with compact notation (`$4.00k`), which obscures precision. Values like $3,987 or $4,123 both display as "$4.00k" or "$4.12k" — losing meaningful detail.

### Change

**File: `src/components/dashboard/sales/WeekAheadForecast.tsx`** — line 64

Replace the compact formatting with a conditional approach:
- Values under $10,000: show full dollar amount with no cents (e.g., `$3,987`, `$4,123`)
- Values >= $10,000: keep compact notation with 2 decimals (e.g., `$12.35k`)

```tsx
// Line 64 — replace:
{formatCurrencyPrecise(value, { compact: true, decimals: 2 })}

// With:
{value >= 10000
  ? formatCurrencyPrecise(value, { compact: true, decimals: 2 })
  : formatCurrencyPrecise(value, { decimals: 0 })}
```

This gives exact visibility for typical daily salon revenue ($1k–$9k range) while keeping compact notation for higher values to avoid label crowding.

