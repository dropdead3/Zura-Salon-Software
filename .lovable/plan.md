

## Remaining Phorest Detach Gaps

Build is currently clean (0 TS errors — the errors in the message are stale). The remaining gaps are **functional**, not type errors.

---

### Category 1: Booking Write-Path Still Wired to Phorest (P0 — Breaks Booking Without Phorest)

**3 booking components** call `create-phorest-booking` edge function which:
- Looks up services from `phorest_services` (line 227)
- Looks up client from `phorest_clients` (line 254)
- Looks up staff via `phorest_staff_mapping` (line 247)
- Inserts into `phorest_appointments` (line 326)
- Requires `phorest_staff_id` and `phorest_branch_id` from callers

**Files calling `create-phorest-booking`:**
- `BookingWizard.tsx` — throws if no `phorest_branch_id`
- `NewBookingSheet.tsx` — passes `phorest_staff_id`
- `QuickBookingPopover.tsx` — entire staff query gated on `phorest_branch_id`
- `DockNewBookingSheet.tsx` — passes `phorest_branch_id`

**Fix:** Create a new `create-booking` edge function (or refactor existing) that:
1. Looks up services from `v_all_services` instead of `phorest_services`
2. Looks up client from `v_all_clients` instead of `phorest_clients`
3. Resolves staff via `employee_profiles` (falling back to `phorest_staff_mapping`)
4. Inserts into native `appointments` table (not `phorest_appointments`)
5. Accepts `location_id` + `user_id` instead of requiring `branch_id` + `phorest_staff_id`

Update the 4 calling components to use `location_id`-based staff queries from `v_all_staff` (flat columns, no FK joins) and pass native IDs.

### Category 2: Appointment Update Edge Functions (P0)

**`update-phorest-appointment`** called from 5 places:
- `DockScheduleTab.tsx` (status updates, drag-drop reschedule)
- `useDockCompleteAppointment.ts` (checkout completion)
- `useUpdateAppointmentServices.ts` (service editing)
- `useTodaysQueue.ts` (queue status)
- `usePhorestCalendar.ts` (status toggle)

**`update-phorest-appointment-time`** called from:
- `useRescheduleAppointment.ts`

These functions write to `phorest_appointments` locally. With the kill switch on, they don't write to Phorest API, but they still target the wrong local table.

**Fix:** Update both edge functions to use source-aware table routing — check if the appointment exists in `appointments` first, fall back to `phorest_appointments`.

### Category 3: Client Creation Edge Functions (P1)

**`create-phorest-client`** called from:
- `NewClientDialog.tsx` — gated on `location.phorest_branch_id`
- `DockNewClientSheet.tsx` — gated on `location.phorest_branch_id`

Without Phorest, `phorest_branch_id` is null, so new client creation silently fails (returns early).

**Fix:** Add native client creation path — insert into `clients` table directly when no Phorest branch is configured.

### Category 4: Staff Query Pattern in Booking Flows (P0)

`QuickBookingPopover.tsx`, `NewBookingSheet.tsx`, `BookingWizard.tsx` all:
- Query `v_all_staff` but use FK join syntax (`employee_profiles!phorest_staff_mapping_user_id_fkey`) which doesn't work on views
- Filter by `phorest_branch_id` (null for standalone orgs)
- Reference `phorest_staff_id` for qualification filtering

**Fix:** Select flat columns from `v_all_staff` (which already includes `display_name`, `photo_url`) and filter by `location_id`.

### Category 5: Staff Qualifications (P0 — Already in Plan)

`useStaffServiceQualifications.ts` still queries `phorest_staff_services` directly. Should use `v_all_staff_qualifications`.

`useBookingAvailability.ts` line 360 still queries `phorest_staff_services` for custom pricing/duration.

### Category 6: Remaining Minor Refs (P2)

- `resolveStaffNames.ts` — queries `phorest_staff_mapping` directly (should use `v_all_staff` view)
- `useClientVisitHistory.ts` — FK join through `phorest_staff_mapping`
- `PerformanceTrendChart.tsx` — queries `phorest_staff_mapping` for ID resolution
- `ServicePopularityChart.tsx` — uses `phorest_staff_id` column from view data (acceptable — column exists in view)

---

### Implementation Plan (5 Steps)

**Step 1 — Refactor `create-phorest-booking` edge function** to support native mode:
- Accept `location_id` + `staff_user_id` as alternatives to `branch_id` + `staff_id`
- Look up services from `v_all_services`, clients from `v_all_clients`
- Insert into `appointments` table (not `phorest_appointments`)
- Keep Phorest write-back path behind kill switch for legacy records

**Step 2 — Refactor `update-phorest-appointment` and `update-phorest-appointment-time`** to use source-aware table routing (try `appointments` first, fall back to `phorest_appointments`).

**Step 3 — Update 4 booking components** (`BookingWizard`, `NewBookingSheet`, `QuickBookingPopover`, `DockNewBookingSheet`) to:
- Query `v_all_staff` with flat columns (no FK join)
- Filter by `location_id` instead of `phorest_branch_id`
- Pass `staff_user_id` + `location_id` to the edge function

**Step 4 — Add native client creation** in `NewClientDialog.tsx` and `DockNewClientSheet.tsx` — insert into `clients` table when no Phorest branch configured.

**Step 5 — Migrate `useStaffServiceQualifications` and `resolveStaffNames`** to use `v_all_staff_qualifications` / `v_all_staff` views respectively.

### What Does NOT Need Changing (Intentional)
- `phorest-adapter.ts` — adapter implementation, Phorest-specific by design
- `usePhorestSync.ts` — sync infra
- `PhorestSettings.tsx`, sync monitoring UI — admin tools, already gated
- `AppointmentBatchBar.tsx` — source-aware routing already correct
- `ArchiveClientToggle.tsx` / `BanClientToggle.tsx` — native-first + fallback already implemented
- `ClientDetailSheet.tsx` — source-aware writes already implemented

### Technical Details

No new database migrations needed. All views exist.

Edge function refactor pattern for `create-phorest-booking`:
```typescript
// Accept native IDs as alternatives
const staff_user_id = body.staff_user_id; // NEW
const location_id = body.location_id;     // EXISTING

// Resolve service details from union view
const { data: services } = await supabase
  .from("v_all_services")
  .select("name, duration_minutes, price, category")
  .in("id", service_ids);  // use unified ID

// Insert into native table
await supabase.from("appointments").insert({
  staff_user_id,
  location_id,
  client_id,
  service_name: serviceName,
  // ...
});
```

Booking component staff query fix:
```typescript
// Before (breaks on views):
.select(`phorest_staff_id, user_id, employee_profiles!fkey(display_name)`)
.eq('phorest_branch_id', branchId)

// After (works standalone):
.select('user_id, display_name, photo_url, location_id')
.eq('location_id', selectedLocation)
.eq('is_active', true)
```

