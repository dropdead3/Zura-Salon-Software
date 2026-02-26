

## Fix Bar Labels in ForecastingCard

The change was applied to the wrong file. The chart visible on your dashboard is `ForecastingCard.tsx`, not `WeekAheadForecast.tsx`. The `AboveBarLabel` in `ForecastingCard.tsx` (line 195) uses a manual compact formatter that always rounds to thousands.

### Change

**File: `src/components/dashboard/sales/ForecastingCard.tsx`** — line 195

Replace the manual `k` formatting with the same conditional approach:

```tsx
// Current (line 195):
{value >= 1000 ? formatCurrencyWholeUtil(Math.round(value / 1000)) + 'k' : formatCurrencyWholeUtil(value)}

// Replace with:
{value >= 10000
  ? formatCurrencyPrecise(value, { compact: true, decimals: 2 })
  : formatCurrencyPrecise(value, { decimals: 0 })}
```

This requires adding the import for `formatCurrency as formatCurrencyPrecise` from `@/lib/format` (if not already present).

- Values under $10,000: full dollar amount, no cents (e.g., `$3,411`, `$4,333`)
- Values >= $10,000: compact with 2 decimals (e.g., `$12.35k`)

### Files
- **Edit**: `src/components/dashboard/sales/ForecastingCard.tsx` (line 195 + import)

