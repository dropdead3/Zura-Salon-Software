

## Fix Build Errors + Phorest Detach Gap Audit

### Part 1: Build Error Fixes (All Same Pattern)

Every build error is the same issue: queries against `v_all_*` views return `SelectQueryError` because the views aren't in the generated types. The fix is adding `as any[]` casts on the query result data.

**Files to fix (8 files, ~30 errors):**

| File | Fix |
|------|-----|
| `ClientRedoHistory.tsx` | Cast `client` and `data` results with `as any` |
| `AppointmentDetailDrawer.tsx` | Cast `items[0]` fields with `as any` |
| `GoalPaceTrendPanel.tsx` | Cast `data` from `v_all_appointments` query |
| `ServicePopularityChart.tsx` | Cast `data` from view query |
| `QuickBookingPopover.tsx` | Cast `data` from `v_all_appointments` query |
| `AttendeeAvailabilityOverlay.tsx` | Cast `phorest` result array |
| `DockClientTab.tsx` | Cast spread of `data` from `v_all_clients` |
| `DockNewBookingSheet.tsx` | Cast service data with `as unknown as PhorestService[]` and appointment query result |
| `KioskBookingWizard.tsx` | Cast staff query results; also fix FK join on view (views don't support FK joins — select flat columns instead) |

### Part 2: Remaining Phorest Gaps (Functional Risks)

After fixing build errors, these are the remaining direct `phorest_*` dependencies that would break or lose data if Phorest is disconnected:

**P0 — Client Writes (ClientDetailSheet.tsx):**
This is the biggest gap. All client profile edits (name, birthday, lead source, category, address, preferences, notes) write exclusively to `phorest_clients`. If a client exists only in the native `clients` table, edits silently fail. Fix: source-aware routing (try `clients` first, fall back to `phorest_clients`).

**P0 — Staff Qualifications (3 hooks):**
`useBookingAvailability.ts`, `useBookingEligibleServices.ts`, and `useStaffServiceQualifications.ts` query `phorest_staff_services` directly instead of `v_all_staff_qualifications`. This means booking flows can't determine which stylists are qualified for which services without Phorest data.

**P0 — Kiosk/Booking Staff Query (KioskBookingWizard.tsx):**
Attempts FK join on `v_all_staff` view (views don't support FK joins in Supabase). Also filters by `phorest_branch_id` which is null for non-Phorest orgs. Fix: select flat columns from the view (which already includes `display_name`, `photo_url` from the view definition) and filter by `location_id`.

**P1 — Staff Utilization (useStaffUtilization.ts):**
Queries `phorest_staff_services` for service duration data. Should use `v_all_staff_qualifications`.

**Intentional / Acceptable:**
- `phorest-adapter.ts` — This is the adapter itself; it's supposed to read `phorest_*` tables
- `usePhorestSync.ts` — Sync infrastructure, Phorest-specific by design
- `PhorestSettings.tsx` — Admin page for managing Phorest connection
- `AppointmentBatchBar.tsx` — Source-aware write (routes to correct table based on `_source`)
- `ArchiveClientToggle.tsx` / `BanClientToggle.tsx` — Already have native-first + fallback pattern
- Sync monitoring UI (`PhorestSyncPopout`, `DataHealthSection`, `SidebarSyncStatusWidget`) — Already gated

### Implementation Plan

**Step 1 — Fix all 8 build error files** with `as any` / `as any[]` casts on view query results.

**Step 2 — Fix KioskBookingWizard staff query** to not use FK join on view; select flat columns and filter by `location_id` instead of `phorest_branch_id`.

**Step 3 — Migrate ClientDetailSheet.tsx writes** to source-aware routing: attempt `clients` table first, fall back to `phorest_clients`.

**Step 4 — Migrate 3 staff qualification hooks** (`useBookingAvailability`, `useBookingEligibleServices`, `useStaffServiceQualifications`) to use `v_all_staff_qualifications` view.

**Step 5 — Migrate useStaffUtilization** `phorest_staff_services` query to `v_all_staff_qualifications`.

No database migrations needed — all required views already exist.

### Technical Details

The `as any` cast pattern for view queries:
```typescript
// Before (errors):
const { data } = await supabase.from('v_all_appointments' as any).select('...');
data.forEach(row => row.appointment_date); // TS error

// After (fixed):
const { data } = await supabase.from('v_all_appointments' as any).select('...');
(data as any[] || []).forEach(row => row.appointment_date); // OK
```

For ClientDetailSheet writes, the pattern follows ArchiveClientToggle:
```typescript
const { error: nativeError } = await supabase.from('clients').update(payload).eq('id', clientId);
if (nativeError) {
  const { error } = await supabase.from('phorest_clients').update(payload).eq('id', clientId);
  if (error) throw error;
}
```

