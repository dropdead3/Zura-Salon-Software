

## Edit Appointment Services (Add/Remove/Swap Mid-Appointment)

### Problem
Currently, `service_name` on both `appointments` and `phorest_appointments` is a comma-separated text field that's set at booking time and never editable after. When a client changes their mind mid-appointment, staff have no way to update the service list.

### Architecture

**Data model:** No new tables needed. The `appointments` table already has `service_name` (comma-separated text), `service_id`, `service_category`, `duration_minutes`, `total_price`. For multi-service, `service_name` holds `"Full Balayage, Maintenance Cut, Blowout"`. We update these fields in place. The `phorest_appointments` table has the same pattern.

**Edge function:** Extend `update-phorest-appointment` to accept a `services` field (array of `{name, price, duration, category}`) that rewrites `service_name`, recalculates `duration_minutes` and `total_price`, and optionally pushes to Phorest when write-back is enabled.

**UI surfaces (3):**

1. **Schedule → AppointmentDetailSheet** (org dashboard) — Add an "Edit" button next to the "Services" heading in the Details tab. Opens a dialog with the org's service catalog (from `phorest_services` / `services`), showing current services as checked, allowing add/remove. On save, calls the edge function.

2. **Dock → DockAppointmentDetail header** — Add a small edit icon next to the service name in the header bar. Opens a bottom sheet with the same service picker, styled for the dock's dark theme.

3. **POS sync** — The edge function already handles dual-table resolution (`phorest_appointments` vs `appointments`). Adding `service_name` to the update payload means POS-synced appointments get updated locally, and when Phorest write-back is enabled, the change propagates.

### Implementation Steps

#### 1. Edge function — add `services` to `update-phorest-appointment`
- Accept optional `services: Array<{name: string, price?: number, duration_minutes?: number, category?: string}>` in the request body
- When present, compute `service_name` (join names with `, `), sum `total_price`, sum `duration_minutes`, take first `service_category`
- Apply to `localUpdate` object alongside existing status/notes/tip updates
- For Phorest write-back: include service data in the PUT body when enabled

#### 2. Shared hook — `useUpdateAppointmentServices`
- New hook in `src/hooks/useUpdateAppointmentServices.ts`
- Calls `update-phorest-appointment` with the `services` payload
- Optimistically updates the `service_name` / `total_price` in the query cache for `phorest-appointments` and `appointments`
- Invalidates relevant queries on success

#### 3. Shared service picker component — `EditServicesDialog`
- New component `src/components/shared/EditServicesDialog.tsx`
- Props: `currentServices: string[]`, `orgId`, `onSave(services)`, `open/onOpenChange`
- Fetches from `phorest_services` (or `services` table as fallback) for the org
- Category-grouped list with checkboxes, search filter
- Shows price and duration per service
- Footer with updated total price and "Save Changes" button

#### 4. Schedule detail sheet integration
- In `AppointmentDetailSheet.tsx` line ~1152, add a pencil/edit button next to the "Services" `<h4>`
- Opens `EditServicesDialog` with current services pre-selected
- On save, calls `useUpdateAppointmentServices` with the appointment ID

#### 5. Dock integration
- In `DockAppointmentDetail.tsx` header area, add a small edit icon next to the service subtitle
- Opens a dock-styled version of the picker (reuses same component with dark theme props)
- On save, updates via the same hook

#### 6. Audit logging
- Log service changes as an audit event via existing `useLogAuditEvent` with `action: 'services_updated'`, capturing before/after

### Files Created/Modified
- **Create:** `src/hooks/useUpdateAppointmentServices.ts`
- **Create:** `src/components/shared/EditServicesDialog.tsx`
- **Modify:** `supabase/functions/update-phorest-appointment/index.ts` — add services handling
- **Modify:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — add edit button + dialog
- **Modify:** `src/components/dock/appointment/DockAppointmentDetail.tsx` — add edit trigger

