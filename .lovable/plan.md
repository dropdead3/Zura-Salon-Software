

## Diagnosis: Two real Phorest appointments, identical client/time, different stylists/locations

### What the data actually says

Two `appointments` rows exist for **Katara Potts on 2026-04-18, 17:00–19:00, "Single Process Color"**:

| Field | Row A (the visible one) | Row B (the unmapped one) |
|---|---|---|
| `id` | `6539b5d2…` | `a7bf2357…` |
| `phorest_staff_id` | `CEJCM1rVldGkgzfWb6ytlQ` | `LTAp-jlMGDKgre8YqAf9Fg` |
| `staff_name` | `Gavin Eagan` | `NULL` |
| `location_id` | `val-vista-lakes` | `north-mesa` |
| `phorest_client_id` | `miHXa2H70RPpDD65ru9gTA` (same) | `miHXa2H70RPpDD65ru9gTA` (same) |
| `created_at` | 2026-04-11 (Phorest) | 2026-04-16 (Phorest) |
| `source` | `phorest` | `phorest` |

Both rows came from the **Phorest sync** (not Zura-native, not a duplicate insert bug). They have **different Phorest IDs**, different staff, and different locations. The unmapped staff `LTAp-jlMG…` has 14 future Phorest appointments at North Mesa — they are a real Phorest staff record that's never been added to `phorest_staff_mapping`.

### So this is one of two things — and we can't tell from the DB alone

1. **Phorest data quality issue** (most likely): the same client was double-booked in Phorest itself, once at Val Vista with Gavin and once at North Mesa with the unmapped stylist. Possibly an admin error in Phorest, possibly a test booking, possibly intentional. Zura is correctly mirroring what Phorest sent.

2. **Zura sync misattribution** (less likely): the sync wrongly attached the same client to two different staff/locations. Would require a bug in `sync-phorest-data`, but we have no evidence of that — the rows have distinct Phorest IDs and `created_at` timestamps 5 days apart, which is consistent with two separate Phorest write events.

Per the **Phorest write-back safety gate** doctrine, Zura cannot delete or modify the Phorest source. The fix is operational, not code — but the surface needs to make this legible.

### The plan

#### 1. Verify upstream (read-only, mandatory before any UI change)
Pull both appointments from Phorest's API directly via `sync-phorest-data` debug or a one-shot fetch on the two `phorest_appointment_id`s. If both exist in Phorest → it's their data, doctrine says don't touch. If only one exists → Zura created a phantom row and we have a sync bug to chase.

I can't make that API call from chat-mode, but the answer determines branch (a) vs (b) below.

#### 2a. If Phorest confirms both exist (expected outcome)
- **Surface the conflict on the Happening Now modal.** When two active appointments share the same `phorest_client_id` + `start_time` across different `location_id` or `phorest_staff_id`, render a single grouped row with an amber `AlertTriangle` + "Double-booked in Phorest — verify with front desk" tooltip. This satisfies the visibility-contracts doctrine: structural drift gets surfaced, not silently rendered as twin rows.
- Implementation: extend `useLiveSessionSnapshot.stylistDetails` with a `conflictGroupId` derived from `${phorest_client_id}::${start_time}::${end_time}`. Group in the UI, don't dedupe in data (we still need both for staff utilization counts).
- Files: `src/hooks/useLiveSessionSnapshot.ts` (group key + flag), `src/components/dashboard/LiveSessionDrilldown.tsx` (render conflict chip).

#### 2b. If only one exists in Phorest (sync bug)
Different plan entirely: investigate `sync-phorest-data` insert path for the failure mode that creates a row with `staff_name: NULL` from a staff ID never written to mapping. That would be its own multi-step trace and likely a separate plan.

#### 3. Independently, fix the unmapped staff (operator task, not code)
`LTAp-jlMGDKgre8YqAf9Fg` has 14 upcoming appointments at North Mesa with no name and no user mapping. The "Sync needed" chip already routes to `/admin/settings/staff-mapping` — operator action will fix it. Not a code task.

### Out of scope
- Deleting or modifying the Phorest-side appointment (write-back forbidden).
- Backfilling `staff_name` for the unmapped row from `v_all_staff` (currently it stays NULL because nothing in `phorest_staff_mapping` resolves it — fixed by the operator mapping action in #3).
- Wave 2 loader sweep, snapshot test refinements (separate threads).

### Verification (after 2a ships)
- The Happening Now modal at North Mesa shows the unmapped row with **two chips**: existing "Sync needed" + new "Double-booked in Phorest". Tooltip on the conflict chip names the other location ("Also booked at Val Vista Lakes with Gavin Eagan, 5:00–7:00 PM").
- The Val Vista row shows the same conflict chip pointing back at North Mesa.
- Stylist counts unchanged (still two real Phorest staff on the schedule).

### Prompt feedback
Sharp instinct — you connected two separate UI rows by recognizing the client name was identical and immediately suspected duplication. That's the right pattern recognition. The refinement: when you make a duplication claim, name the **dimension you'd expect to differ if they were distinct** ("if these were two real appointments, they'd have different times or different services — they don't, so it's a dupe"). That forces the diagnosis to either confirm (true dupe) or break the assumption (turns out it's same time/client across two locations, which is a *different* failure mode — a Phorest double-booking, not a Zura render bug). The dimension you missed was `phorest_appointment_id` differing across the two rows, which flips the diagnosis from "render bug" to "upstream data conflict."

