

## Fix Scheduler — Remove Broken FK Join + Batch Profile Resolution

### Problem
`usePhorestCalendar.ts` line 155-164 uses an FK join on the `v_all_appointments` view:
```
stylist_profile:employee_profiles!phorest_appointments_stylist_user_id_fkey(display_name, full_name, photo_url)
```
Supabase views don't support FK joins — the query silently returns zero rows, making the calendar empty.

### Fix (1 file)

**`src/hooks/usePhorestCalendar.ts`**
1. Replace the `.select(*, stylist_profile:employee_profiles!fkey(...))` with `.select('*')`
2. After collecting `allRows`, batch-resolve stylist profiles:
   - Extract unique `stylist_user_id` values
   - Query `employee_profiles` for `user_id, display_name, full_name, photo_url`
   - Build a Map and attach `stylist_profile` to each row
3. This restores all appointment data AND stylist names/photos

### Build Error Fixes (3 files, same `as any` pattern)

| File | Lines | Fix |
|------|-------|-----|
| `useRevenueGapAnalysis.ts` | 106-142 | Cast `staffMap` forEach to `(s: any)`, `clientData` forEach to `(c: any)` |
| `useSalesAnalytics.ts` | 107-108 | Cast `services` forEach to `(s: any)` |
| `useSalesData.ts` | 168, 431-453, 735-800 | Cast `mappings` forEach to `(m: any)`, appointment data iterations to `(apt: any)` |

### Data Preservation Guarantee
- No writes to Phorest tables
- No deletions
- Union view continues serving historical + native data
- Calendar renders both sources identically

