

## Fix: Non-Currency Counts Showing Decimal Places

Good catch. The penny-precision fix changed `AnimatedBlurredAmount`'s default `decimals` from `0` to `2`, which correctly shows `$4,050.00` for currency but incorrectly shows `36.00` for transaction counts, visit counts, and other integer metrics.

### Root Cause

`AnimatedBlurredAmount` (line 25) defaults `decimals = 2` regardless of whether the value is currency or a count. When no `currency` prop is passed, counts like Transactions, Total Visits, and New Bookings get formatted with `.00`.

### Fix

**File: `src/components/ui/AnimatedBlurredAmount.tsx`** (1 line change)

Change the default `decimals` to be context-aware: default to `2` when `currency` is provided, `0` when it's a plain count.

```typescript
// Line 25, change:
decimals = 2,

// To:
decimals,

// Then at line 76, resolve the default based on context:
const resolvedDecimals = decimals ?? (currency ? 2 : 0);
```

Use `resolvedDecimals` in the formatting logic (lines 76-80) instead of `decimals`. This is a single-file, 3-line change that fixes every caller automatically -- no need to touch the ~12 component files that use `AnimatedBlurredAmount` without `currency`.

### What changes

| Metric | Before | After |
|--------|--------|-------|
| Transactions | 36.00 | 36 |
| Total Visits | 22.00 | 22 |
| New Bookings | 5.00 | 5 |
| Revenue | $4,050.00 | $4,050.00 (unchanged) |
| Avg Ticket | $176.00 | $176.00 (unchanged) |

### What stays the same

All currency-formatted values (anything with `currency` prop) remain at 2 decimal places. Only plain numeric counts revert to whole numbers.

