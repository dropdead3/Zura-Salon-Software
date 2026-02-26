

## Fix: Retail showing 100% when no sales data

**Root cause**: The Retail percentage is calculated as `100 - servicePercent`. When total is 0, `servicePercent` defaults to 0, so Retail becomes `100 - 0 = 100%`.

**Fix in `src/components/dashboard/sales/RevenueDonutChart.tsx`**:

Derive `retailPercent` independently instead of using `100 - servicePercent`:

```tsx
const retailPercent = total > 0 ? Math.round((productRevenue / total) * 100) : 0;
```

Then replace all three instances of `{100 - servicePercent}` with `{retailPercent}`.

### File changed
- `src/components/dashboard/sales/RevenueDonutChart.tsx` — add `retailPercent` variable, replace 3 occurrences of `{100 - servicePercent}%`

