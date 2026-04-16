

# Phorest Detach Safety: Calendar Data Preservation Build

## Goal

Ensure that when Phorest is disconnected, the schedule UI continues to **read, write, and create** appointments / breaks / clients without losing data or breaking flows.

## Current state (assessment)

**Already safe:**
- All calendar **reads** go through `v_all_appointments`, `v_all_clients`, `v_all_staff`, `v_all_staff_qualifications` — these UNION Phorest + Zura-native rows.
- `update-phorest-appointment` edge function has `PHOREST_WRITES_GLOBALLY_DISABLED = true` (writes never leave the platform).
- `useStaffScheduleBlocks` already backwards-matches both `location_id` and `phorest_branch_id`.

**Risk areas (where data loss / breakage will happen on detach):**

| # | File / Location | Issue |
|---|---|---|
| 1 | `AppointmentDetailSheet.tsx` (5 sites) | Status, notes, stylist change, cancel, delete write directly to `phorest_appointments` based on `_source`. If Phorest sync stops, no new rows land there — but **existing rows** must remain editable. New appointments routed to `appointments` (Zura-native). |
| 2 | `EditAppointmentDialog.tsx` | Notes update tries `appointments` first, falls back to `phorest_appointments`. Order is correct; needs to stay. |
| 3 | `AppointmentDetailDrawer.tsx` (hub) | Cancel writes to `phorest_appointments` for `_source === 'phorest'` rows. Same pattern. |
| 4 | `BookingWizard.tsx` → `create-booking` edge fn | Passes `phorest_client_id` and `phorest_staff_id`. When Phorest is detached, new clients/stylists won't have these IDs. Must fall back to Zura `client_id` / `staff_user_id`. |
| 5 | `useStaffScheduleBlocks` | New blocks created via `AddTimeBlockForm` already write `user_id` + `location_id` (Zura IDs). Existing legacy rows with only `phorest_staff_id` need a one-time backfill mapping to `user_id`. |
| 6 | `usePhorestCalendar` `lastSync` + `triggerSync` | Reads `phorest_sync_log`, calls `sync-phorest-data`. Should hide / no-op when no Phorest connection exists. Already partially handled by `usePOSProviderLabel().isConnected` in the sync button. |
| 7 | `update-phorest-appointment` edge fn | Already routes to `appointments` table when row not found in `phorest_appointments`. Safe. Should be renamed to `update-appointment` (cosmetic) post-detach but **not now** — renaming breaks every caller. |

## Plan (3 changes)

### 1. Continue serving legacy Phorest-synced appointments after detach

When Phorest sync is paused, the existing `phorest_appointments` rows must remain readable and editable indefinitely. We'll add a database guard so those rows are never deleted by an automated cleanup.

- Add a migration creating an `is_archived` boolean on `phorest_appointments` (default false) with an RLS-safe trigger that blocks `DELETE` on rows where `is_archived = true`. This protects historical data from accidental purges.
- Add a one-time backfill SQL: for every `staff_schedule_blocks` row where `user_id IS NULL` and `phorest_staff_id IS NOT NULL`, populate `user_id` from `phorest_staff_mapping`. Same for `location_id` → resolve from `phorest_branch_id` via `locations` table.

### 2. Booking creation: Zura-native fallback

In `BookingWizard.tsx` (line ~161) and the `create-booking` edge function, when `selectedClient.phorest_client_id` is null OR `stylistMapping.phorest_staff_id` is null, write the appointment directly into the Zura-native `appointments` table with `client_id` + `staff_user_id` instead of failing or writing a NULL phorest reference. This is already half-built — we need to verify the edge function handles the null path and add explicit fallback if not.

### 3. Hide Phorest-only UI when disconnected

In `usePhorestCalendar`:
- Wrap the `lastSync` query in `enabled: usePOSProviderLabel().isConnected`.
- `triggerSync` becomes a no-op (with a friendly toast: "Calendar runs natively — sync not needed") when not connected.

In `AppointmentDetailSheet`, add a small badge showing "Source: Synced (legacy)" vs "Source: Native" so admins can see which records are which during the transition.

## Out of scope (intentionally)

- **Renaming the edge function** `update-phorest-appointment` → `update-appointment`: would touch 20+ call sites for cosmetic value. Defer to post-detach cleanup.
- **Migrating historical `phorest_appointments` rows into `appointments`**: not needed — the union view handles it. Migration would risk data corruption.
- **Removing `_source` branching**: still required while both tables exist. Becomes dead code after `phorest_appointments` is fully retired.

## Files touched

- `supabase/migrations/<new>.sql` — archive flag + delete guard + schedule_blocks backfill
- `src/components/dashboard/schedule/booking/BookingWizard.tsx` — Zura-native fallback path
- `supabase/functions/create-booking/index.ts` — verify null-id handling
- `src/hooks/usePhorestCalendar.ts` — gate `lastSync` + `triggerSync` on POS connection
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — source badge

## Verification after build

1. With Phorest still connected: open an existing Phorest appointment, change status → writes to `phorest_appointments`, view refreshes.
2. Disable POS connection in settings: open the same appointment → still readable, status update still works (routes via edge function which falls through to `appointments` if needed).
3. Create a brand-new appointment with no `phorest_client_id` → lands in `appointments`, appears on calendar via union view.
4. Add a break for a staff member → lands in `staff_schedule_blocks` with `user_id` populated, visible immediately.
5. Confirm legacy schedule blocks (with only `phorest_staff_id`) now resolve to a `user_id` after backfill.

