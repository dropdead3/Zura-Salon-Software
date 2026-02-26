

## Fix: Forecast Bar Labels Show Rounded Compact Amounts

The bar labels on the Week Ahead Forecast card currently display `$4.00k`, `$3.00k` — compact notation that rounds to the nearest thousand, hiding the actual scheduled amounts. They should show precise compact values like `$4.23k`, `$3.87k`.

### Root Cause

The `AboveBarLabel` component in `WeekAheadForecast.tsx` (line 64) calls `formatCurrencyWholeUtil(value)` which formats with 2 decimals but no compact notation. If the displayed output is actually compact (as shown in the screenshot), the values are being rounded to whole-K amounts, losing precision.

### Fix

**File: `src/components/dashboard/sales/WeekAheadForecast.tsx`**

Update the `AboveBarLabel` component (line 48-68) to use a compact formatter that preserves meaningful decimal precision:

- For values >= $1,000: use `Intl.NumberFormat` with `notation: 'compact'` and 2 decimal digits so `$4,230` renders as `$4.23k` and `$3,000` renders as `$3.00k`
- For values < $1,000: use standard formatting with 2 decimals (e.g., `$327.00`) — no compact suffix needed

This will be done by replacing the `formatCurrencyWholeUtil(value)` call with the org-aware `formatCurrencyCompact` or a local compact formatter that uses `maximumFractionDigits: 2` and `minimumFractionDigits: 2` with `notation: 'compact'`.

Since `AboveBarLabel` is a plain function (not a hook), the simplest approach is to use `formatCurrency` from `@/lib/format.ts` directly with `{ compact: true, decimals: 2 }`.

### What Changes

| Value | Before | After |
|-------|--------|-------|
| $4,230 | $4.00k | $4.23k |
| $3,870 | $4.00k | $3.87k |
| $327 | $327.00 | $327.00 |

