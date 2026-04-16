<final-text>
## Prompt review

Good prompt. You clearly identified the user expectation and the trigger path: clicked an open slot in Alexis’ column, then expected Alexis to be surfaced first or preselected. That’s strong debugging input because it ties the broken behavior to a specific interaction, not just a vague empty state.

Even tighter prompt framing for next time:
- name the exact surface: “Quick Booking popover from Day View”
- mention whether services were already selected
- mention whether the issue is “empty list” vs “wrong default”

That helps separate:
1. preselection bugs
2. data-loading bugs
3. qualification-filter bugs

## Diagnosis

There are actually **three stacked issues** causing this:

1. **Clicked stylist is never applied**
   - `Schedule.tsx` correctly passes the clicked column’s stylist as `defaultStylistId`.
   - `QuickBookingPopover.tsx` receives `defaultStylistId`.
   - But the popover never uses it to initialize `selectedStylist` or `preSelectedStylistId`.
   - So clicking Alexis’ column does **not** default the flow to Alexis.

2. **The stylist query is failing**
   - Current `v_all_staff` request selects `stylist_level`, but that column does **not** exist on `v_all_staff`.
   - Network log confirms the 400:
     - `column v_all_staff.stylist_level does not exist`
   - Result: “Available Stylists” becomes empty.

3. **Qualification filtering is also broken**
   - `useQualifiedStaffForServices` still queries old column names on `v_all_staff_qualifications`:
     - expects `phorest_service_id` / `phorest_branch_id`
     - actual view has `service_external_id` / `branch_id`
   - It also queries `staff_service_qualifications.service_id` using a Phorest external ID string, which causes UUID errors.
   - Network log confirms both failures.
   - So even after fixing stylist preselection, service qualification can still wrongly collapse the list.

## What to build

### 1) Fix clicked-slot stylist preselection
In `QuickBookingPopover.tsx`:
- when opening with `defaultStylistId`, initialize the booking state from it
- set `selectedStylist` to that stylist on open
- optionally promote it to the first/highlighted stylist in the stylist step
- preserve existing draft/rebook behavior so draft data still wins when present

Expected result:
- clicking Alexis’ column opens the wizard already scoped to Alexis
- Alexis appears selected first instead of requiring manual selection

### 2) Fix the broken stylist fetch
In `QuickBookingPopover.tsx`:
- stop selecting `stylist_level` from `v_all_staff`
- if level is needed for UI, hydrate it separately from `employee_profiles` or tolerate `null`
- add explicit error handling instead of silently coercing failed queries to `[]`

Expected result:
- North Mesa stylists actually load again

### 3) Fix qualification queries to the current schema
In `useStaffServiceQualifications.ts`:
- update the unified qualification view query to use:
  - `service_external_id` instead of `phorest_service_id`
  - `branch_id` instead of `phorest_branch_id`
- for manual qualifications, resolve selected service external IDs to real internal `service_id` UUIDs before querying `staff_service_qualifications`
- in the consumer, filter by both:
  - `qualifiedStaffIds` via `phorest_staff_id`
  - `qualifiedUserIds` via `user_id`
  - and exclude `disqualifiedUserIds`

Expected result:
- qualification filtering stops throwing 400s
- stylists qualified for the selected service still appear correctly

## Files to update

- `src/components/dashboard/schedule/QuickBookingPopover.tsx`
  - apply `defaultStylistId` on open
  - repair stylist fetch
  - surface selected/default stylist first in UI
  - add error handling for failed staff load

- `src/hooks/useStaffServiceQualifications.ts`
  - align queries to current database schema
  - resolve external service IDs to internal UUIDs for manual qualification checks
  - return data in a way the booking flow can use safely

## Acceptance checks

1. Click an open slot in **Alexis’** column.
2. Open Quick Booking.
3. Pick client Eric Day.
4. Reach stylist step.
5. Alexis is already selected or shown first.
6. North Mesa stylists are visible instead of an empty list.
7. If a service is selected, only qualified stylists remain.
8. No 400 errors for:
   - `v_all_staff`
   - `v_all_staff_qualifications`
   - `staff_service_qualifications`

## Follow-up enhancements

- Add a small badge at the top: “Booking with Alexis” when launched from a stylist column.
- If the clicked stylist is unavailable for the selected service, show Alexis first with a clear “Not qualified for selected service” reason instead of silently removing her.
- Consolidate the booking popover and booking wizard stylist-loading logic so these schema drifts do not happen in only one surface.
</final-text>