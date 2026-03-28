

## Problem

The Rev/Hour KPI tile shows `$0.00` for the "Today" view. The root cause is in `useTodayActualRevenue.tsx` line 302 — `actualServiceHours` is hardcoded to `0`. The display logic in `AggregateSalesCard.tsx` checks `todayActual.actualServiceHours > 0` before calculating, so it always falls through to `0`.

## Plan

**File: `src/hooks/useTodayActualRevenue.tsx`**

### 1. Add a query to fetch today's service hours from appointments

Add a new `useQuery` that calculates total service hours from today's completed appointments using `start_time` and `end_time` (same approach as `useSalesData.ts` line 358):

```ts
const serviceHoursQuery = useQuery({
  queryKey: ['today-service-hours', today],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('phorest_appointments')
      .select('start_time, end_time')
      .eq('appointment_date', today)
      .not('status', 'in', '("cancelled","no_show")')
      .not('start_time', 'is', null)
      .not('end_time', 'is', null);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    return data.reduce((sum, apt) => {
      const start = new Date(apt.start_time).getTime();
      const end = new Date(apt.end_time).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return sum + (hours > 0 ? hours : 0);
    }, 0);
  },
  enabled,
  refetchInterval: 5 * 60 * 1000,
});
```

### 2. Wire `actualServiceHours` to the query result

Line 302: Replace the hardcoded `0`:

```ts
actualServiceHours: serviceHoursQuery.data ?? 0,
```

### Result
- Today's Rev/Hour will correctly calculate `actualRevenue / actualServiceHours`
- The KPI tile will show the real revenue per service hour
- Reuses the same duration calculation pattern as `useSalesData.ts`

### Files modified
- `src/hooks/useTodayActualRevenue.tsx`

