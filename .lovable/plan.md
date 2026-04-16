

# Why Phorest Breaks Are Not Showing in the Zura Schedule

## Root Cause

**Phorest breaks are a completely separate API entity from appointments.** The `sync-phorest-data` edge function only calls the Phorest `/appointment` endpoint, which returns client-facing bookings. Breaks, lunches, and staff roster blocks live under the **Roster API** (`/branch/{branchId}/roster`) — and the sync function never calls this endpoint.

There is also **no database table** to store break/roster data. The `phorest_appointments` table has no `appointment_type` or `is_break` column, and no dedicated `phorest_roster_blocks` or `staff_breaks` table exists.

## What Needs to Happen

### 1. Database — Create a `staff_schedule_blocks` table
A new table to store breaks, lunches, and blocked time synced from Phorest (and eventually created natively in Zura):

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | Row ID |
| user_id | uuid (nullable) | Mapped Zura user |
| phorest_staff_id | text | Phorest staff reference |
| location_id | text | Location |
| block_date | date | Date of the block |
| start_time | time | Start |
| end_time | time | End |
| block_type | text | `break`, `lunch`, `meeting`, `off`, `blocked` |
| label | text | Display label (e.g. "Lunch", "Break") |
| source | text | `phorest` or `zura` |
| phorest_id | text (unique) | Dedup key for Phorest syncs |
| organization_id | uuid | Tenant isolation |
| created_at / updated_at | timestamptz | Timestamps |

RLS policy scoped to `organization_id`.

### 2. Edge Function — Add roster sync to `sync-phorest-data`
Add a new `syncRoster()` function that:
- Calls `GET /branch/{branchId}/roster?from_date=X&to_date=Y` for each branch
- The Phorest roster API returns staff working hours and break entries per day
- Parses break entries (type, start/end times) and maps staff via `phorest_staff_mapping`
- Upserts into `staff_schedule_blocks` with `source = 'phorest'`
- Wire it into the `appointments` and `all` sync types

### 3. Frontend — Render blocks on the schedule grid
- Create a hook `useStaffScheduleBlocks(date, locationId)` that queries `staff_schedule_blocks`
- In `DayView.tsx`, render break blocks as distinct visual elements (hatched/striped overlay or muted card) in the stylist's column — similar to how `AssistantBlockOverlay` works but for breaks
- In `WeekView.tsx`, render break indicators similarly
- Use a distinct visual style: muted background, "Break" or "Lunch" label, non-clickable

### Files to Create/Modify
1. **New migration** — `staff_schedule_blocks` table + RLS
2. **`supabase/functions/sync-phorest-data/index.ts`** — add `syncRoster()` function
3. **New hook**: `src/hooks/useStaffScheduleBlocks.ts`
4. **New component**: `src/components/dashboard/schedule/BreakBlockOverlay.tsx`
5. **`src/components/dashboard/schedule/DayView.tsx`** — render break blocks per column
6. **`src/components/dashboard/schedule/WeekView.tsx`** — render break blocks

## Technical Note on Phorest Roster API
The Phorest Third-Party API roster endpoint returns staff schedules including break periods. The exact response shape will need to be verified via a test call. The endpoint pattern is:
```
GET /business/{businessId}/branch/{branchId}/roster?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
```

A test call should be made first to confirm the response structure before building the parser.

