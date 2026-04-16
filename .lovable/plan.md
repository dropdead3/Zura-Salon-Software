
Good news: the break sync is now working. The problem has shifted from “not pulling” to “not showing.”

## Root cause
- Edge function logs show: `Break sync complete: 37 break blocks inserted`
- Database inspection confirms 37 rows exist in `staff_schedule_blocks`
- The mismatch is in `location_id`:
  - `appointments.location_id` stores app location IDs like `north-mesa` / `val-vista-lakes`
  - `staff_schedule_blocks.location_id` currently stores raw Phorest branch IDs like `hYztERWv...` / `6YPlWL5...`
- `Schedule.tsx` passes the selected app location ID into `useStaffScheduleBlocks`
- `useStaffScheduleBlocks` filters `staff_schedule_blocks.location_id = selectedLocation`
- Result: breaks are filtered out before DayView / WeekView ever render them

## Plan
1. Fix the sync writer
- Update `supabase/functions/sync-phorest-data/index.ts`
- Build a branch-to-location map from `locations.phorest_branch_id -> locations.id`
- When inserting break blocks, store the app location ID in `staff_schedule_blocks.location_id` instead of the raw branch ID
- Update the delete step to delete by mapped app location ID
- Keep logging for unmapped branches so future sync issues are visible

2. Add a compatibility fallback in the reader
- Update `src/hooks/useStaffScheduleBlocks.ts`
- When a location is selected, resolve that location’s `phorest_branch_id`
- Query blocks where `location_id` matches either:
  - the app location ID, or
  - the legacy Phorest branch ID
- This makes existing synced records appear immediately after deploy, even before backfill

3. Backfill existing break rows
- Run a one-time data update to convert existing `staff_schedule_blocks.location_id` values from raw branch IDs to app location IDs using `locations.phorest_branch_id`
- No schema migration is required for this fix

4. Verify schedule rendering
- Re-test Day and Week views for both locations
- Confirm breaks appear under the correct stylist column and correct date
- Confirm switching locations hides/shows the right break blocks

## Files to update
- `supabase/functions/sync-phorest-data/index.ts`
- `src/hooks/useStaffScheduleBlocks.ts`

## Technical notes
- DayView and WeekView do not appear to be the root cause; they already render whatever `scheduleBlocks` they receive
- Database evidence already proves the mismatch:
  - `appointments`: app location IDs
  - `staff_schedule_blocks`: branch IDs
- This is why appointments show while breaks do not
