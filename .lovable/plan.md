

## Fix Build Errors + Scheduler Data Persistence

### Part 1: Fix Build Errors (7 files, same `as any` cast pattern + 1 missing return)

All errors are `SelectQueryError` from queries against `v_all_*` views. Fix by casting results.

| File | Fix |
|------|-----|
| `useStylistAvailability.ts` L203,208 | Cast `appointments` to `any[]` before `.filter()` and pass cast result to `calculateAvailableMinutes` |
| `useStylistIncomeForecast.ts` L52-53 | Cast `appointments` to `any[]` before `.reduce()` |
| `useTodayActualRevenue.tsx` L73-74, L106-114, L146, L185-199, L242-245 | Cast `data`/`txnData` to `any[]` in all 4 queries (service hours, actual revenue, location revenue, last appt) |
| `useTodaysQueue.ts` L133 | Change `as PhorestAppointment[]` to `as unknown as PhorestAppointment[]` |
| `useTomorrowRevenue.ts` L32-34 | Cast `data` to `any[]` before `.reduce()` |
| `goal-metric-fetchers.ts` L31,53,74,124,145 | Cast `data` to `any[]` in all 5 fetcher functions |
| `useReengagementCampaigns.ts` L196 | Add missing `return`: change `(data \|\| []) as any[];` to `return (data \|\| []) as any[];` |

### Part 2: Phorest Appointment Data Persistence (No Migration Needed)

The user wants Phorest appointments to persist in the Zura-native `appointments` table so data survives detach.

**Current state**: The `v_all_appointments` view already unions `phorest_appointments` and native `appointments`. The scheduler reads from this view and shows both. The native `appointments` table already has all needed columns (including `phorest_client_id`, `phorest_staff_id`, `import_source`).

**What's needed**: A one-time data migration edge function that copies existing `phorest_appointments` into the `appointments` table with `import_source = 'phorest'`. The view already filters `WHERE a.import_source IS DISTINCT FROM 'phorest'` to avoid duplicates — so both can coexist safely.

I will create an edge function `migrate-phorest-appointments` that:
1. Reads all `phorest_appointments` that don't already have a corresponding row in `appointments`
2. Maps columns (phorest_staff_id → staff_user_id via phorest_staff_mapping, phorest_client_id, etc.)
3. Inserts into `appointments` with `import_source = 'phorest'`
4. Returns count of migrated rows

**Important**: The view filter `WHERE a.import_source IS DISTINCT FROM 'phorest'` currently EXCLUDES phorest-imported rows from the native side of the union to prevent duplicates. After migration, the data lives in both tables but only shows once in the view (from the `phorest_appointments` side). When Phorest is detached, we simply update the view to include `import_source = 'phorest'` rows from the native table, or drop the phorest side of the union entirely.

### Execution Order
1. Fix all build errors (Part 1) — restores scheduler rendering
2. Create migration edge function (Part 2) — ensures data persistence

