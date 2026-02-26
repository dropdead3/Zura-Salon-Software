

## Real-time sales updates via database subscriptions

**Problem**: Sales data only refreshes on a 5-minute polling interval or manual sync. When POS transactions land in `phorest_daily_sales_summary`, the UI stays stale until the next poll.

**Solution**: Subscribe to Postgres realtime changes on `phorest_daily_sales_summary` and invalidate the relevant TanStack Query caches immediately when rows are inserted or updated.

### 1. Enable realtime on the table (database migration)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.phorest_daily_sales_summary;
```

### 2. Add realtime subscription in `useTodayActualRevenue` hook

**File: `src/hooks/useTodayActualRevenue.ts`**

- Import `useEffect` and `useQueryClient`
- Add a `useEffect` that subscribes to `postgres_changes` on `phorest_daily_sales_summary` filtered to today's `summary_date`
- On any `INSERT` or `UPDATE` event, call `queryClient.invalidateQueries` for keys: `today-actual-revenue`, `today-actual-revenue-by-location`
- Clean up the channel subscription on unmount
- Keep the existing 5-minute polling as a fallback safety net

### Files changed
- Database migration: enable realtime on `phorest_daily_sales_summary`
- `src/hooks/useTodayActualRevenue.ts` — add realtime subscription + query invalidation

