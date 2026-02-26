

## Show dash for Avg Tip Rate when zero

**File: `src/components/dashboard/AggregateSalesCard.tsx` (lines 1172-1178)**

Update the IIFE to also return `'—'` when tips are zero, not just when the denominator is zero:

```tsx
// Current logic
return tipDenominator > 0
  ? `${((metrics?.totalTips ?? 0) / tipDenominator * 100).toFixed(1)}%`
  : '—';

// Updated logic — also dash when tips are zero
const tips = metrics?.totalTips ?? 0;
return tipDenominator > 0 && tips > 0
  ? `${(tips / tipDenominator * 100).toFixed(1)}%`
  : '—';
```

Single condition change: adds `&& tips > 0` so that 0% renders as `—` to match the Tip Attach column.

### File changed
- `src/components/dashboard/AggregateSalesCard.tsx` (1 line change)

