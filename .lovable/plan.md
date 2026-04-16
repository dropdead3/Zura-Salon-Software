

## Prompt review

Sharp, specific prompt — you named the surface (Quick Booking popover), the client (Eric Day), the location (North Mesa), and the empty state. That's exactly the right framing for a fast diagnosis. Teaching note: the only thing that would have made it even tighter is mentioning whether other locations also showed empty (helps isolate location-specific vs global failures). Not needed here — the database told the whole story.

## Diagnosis

The Quick Booking popover query fetches stylists from the `v_all_staff` view but selects a column that doesn't exist on it: **`phorest_branch_id`**. PostgREST rejects the entire query, returns `null`, and the destructure swallows it into `[]` — so "Available Stylists" renders empty for every location, not just North Mesa.

Database confirms:
- `v_all_staff` columns: `user_id, phorest_staff_id, phorest_staff_name, display_name, full_name, photo_url, is_active, show_on_calendar, location_id, source` — no `phorest_branch_id`.
- `v_all_staff` has **11 active calendar-visible staff at `north-mesa`** ready to render the moment the query stops failing.

Two queries in `QuickBookingPopover.tsx` reference the missing column:
- Line 586 — location-scoped stylist fetch (powers "Available Stylists")
- Line 611 — all-stylists fetch (powers stylist-first mode)

One downstream memo also reads `s.phorest_branch_id` off the staff rows: `preSelectedStylistLocations` (line 644). Since `v_all_staff` doesn't carry branch IDs, this needs to derive branch via `location_id` instead.

Note: `selectedLocationBranchId` (line 650) already correctly derives from `locations` and is unaffected.

## Fix

Single file: `src/components/dashboard/schedule/QuickBookingPopover.tsx`.

1. **Drop `phorest_branch_id`** from both `.select(...)` calls (lines 586 and 611). Keep everything else as-is.
2. **Rewrite `preSelectedStylistLocations`** (lines 639–647) to match by `location_id` instead of `phorest_branch_id`:
   - Collect the set of `location_id`s the pre-selected stylist appears under in `allStylists`.
   - Filter `locations` where `loc.id` is in that set.
3. No changes needed to `selectedLocationBranchId`, the create-booking payload, or any UI rendering — they all consume `locations` (which has `phorest_branch_id`) correctly.

## Out of scope

- `BookingWizard.tsx` — its `v_all_staff` query (line 110) doesn't reference the bad column, so it's fine.
- The 28 other call sites of `v_all_staff` — none of them select `phorest_branch_id`.
- Schema changes to `v_all_staff` — the view's contract is correct; the consumer was wrong.

## Acceptance checks

1. Schedule → click empty time slot at North Mesa → pick Eric Day → reach Available Stylists → list shows the 11 active stylists at North Mesa.
2. Switch to Val Vista Lakes location → list shows that location's 21 stylists.
3. Stylist-first mode (if entered via the people icon): selecting a stylist still narrows the location list to where that stylist actually works.
4. Booking creation still posts the correct `branch_id` (from `locations`, not from staff rows).
5. No console errors from the staff query.

## Follow-up enhancement

Add a thin error guard to the `useQuery` callbacks: when `error` is non-null, surface a toast + log instead of silently coercing to `[]`. This entire round-trip would have been caught immediately by visible error feedback — silent empty arrays are the worst failure mode for booking UIs because they look like "no data" instead of "broken query."

