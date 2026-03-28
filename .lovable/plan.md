

## Problem

The "Expected" badge on the today view shows `displayMetrics.totalRevenue` (which is **POS actual revenue**), not scheduled revenue from appointments. This is why "Expected" equals actual — they're the same number.

The root cause is two-fold:

1. **`useScheduledRevenue` is only enabled for past ranges** — line 373 passes `isPastRange` as the `enabled` flag, so for today it never fires.
2. **The today Expected badge reads `displayMetrics.totalRevenue`** (line 815) instead of `scheduledRevenue`.
3. **The gap analysis also uses `metrics?.totalRevenue`** as the "expected" for today (line 380), meaning it compares actual vs actual — producing zero gap.

## Plan

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

### 1. Enable `useScheduledRevenue` for today too

Line 373: Change the enabled flag from `isPastRange` to `isPastRange || isToday`:

```ts
const { data: scheduledRevenue, isLoading: scheduledLoading } = useScheduledRevenue(
  dateFilters.dateFrom,
  dateFilters.dateTo,
  filterContext?.locationId,
  isPastRange || isToday
);
```

### 2. Fix the today Expected badge to use `scheduledRevenue`

Line 802: Update `exceededExpected` to compare actual against scheduled:

```ts
const exceededExpected = !!(todayActual?.hasActualData && scheduledRevenue != null && todayActual.actualRevenue > scheduledRevenue && scheduledRevenue > 0);
```

Line 815: Display `scheduledRevenue` instead of `displayMetrics.totalRevenue`:

```tsx
<span>{formatCurrency(scheduledRevenue ?? 0)}</span>
```

Line 844: Fix progress bar denominator:

```tsx
value={scheduledRevenue && scheduledRevenue > 0 
  ? Math.min((todayActual.actualRevenue / scheduledRevenue) * 100, 100) 
  : 0
}
```

### 3. Fix the gap analysis expected value for today

Line 380: Use `scheduledRevenue` for today instead of `metrics?.totalRevenue`:

```ts
isToday ? (scheduledRevenue ?? 0) : (scheduledRevenue ?? 0),
```

Line 382: Update the enabled condition to require scheduledRevenue for today too:

```ts
(isPastRange || isToday) && activeDrilldown === 'expectedGap' && scheduledRevenue != null,
```

### 4. Hide the Expected badge when scheduled data is still loading

Add a guard so the badge doesn't flash incorrect values while `scheduledRevenue` loads. Around line 799:

```tsx
{isToday && scheduledRevenue != null && scheduledRevenue > 0 && (
```

This ensures:
- "Expected" shows the sum of `total_price` from scheduled appointments (what the day *should* earn)
- The progress bar correctly tracks actual vs scheduled
- The gap analysis compares actual vs scheduled (not actual vs actual)
- The badge is hidden until scheduled data is available

