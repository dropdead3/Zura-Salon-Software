

## Populate Edit Services Menu in Demo Mode + Gap Analysis

### Problem
`DockEditServicesSheet` uses `useServicesByCategory(locationId)` which queries the real `phorest_services` DB table. Demo appointments have `location_id: null`, so the query is disabled → "No services found."

### Root cause
No demo fallback exists for the services catalog in the edit sheet.

### Fix

**1. `src/components/dock/appointment/DockEditServicesSheet.tsx`**
- Import `useDockDemo` and `DEMO_SERVICES_BY_CATEGORY` from demo data
- When `isDemoMode && !locationId`, skip the DB query and use `DEMO_SERVICES_BY_CATEGORY` directly as the grouped data (the `DemoService` type already matches `PhorestService` shape)

**2. `src/hooks/useUpdateAppointmentServices.ts`** — Demo save short-circuit
- Currently calls the `update-phorest-appointment` edge function, which will fail for `demo-appt-*` IDs
- Add a demo check: if `appointmentId` starts with `demo-`, skip the edge function call and return a mock success
- Update the local `DEMO_APPOINTMENTS` service_name in sessionStorage so the change persists within the session

**3. `src/components/dock/appointment/DockAppointmentDetail.tsx`** — Reflect saved demo services
- After a demo save, update `appointment.service_name` locally so the header reflects the change without needing a real query refetch
- Read from sessionStorage key `dock-demo-services::${appointmentId}` as override for `currentServices`

### Gap: Demo service edits don't persist across navigation

When the user saves edited services in demo mode, the appointment card on the schedule list won't reflect the change because `DEMO_APPOINTMENTS` is a static const. 

**Fix**: Store edited service names in sessionStorage (`dock-demo-services::demo-appt-X`), and have `useDockAppointments` merge these overrides when returning demo data. This follows the same pattern used for demo notes and demo bowls.

### Gap: Reset handler missing service overrides

**Fix in `DockDeviceSwitcher.tsx`**: The sessionStorage cleanup loop already clears all `dock-demo-*` keys, so `dock-demo-services::*` keys will be cleaned automatically. No additional code needed.

### Summary — 4 files changed
1. `src/components/dock/appointment/DockEditServicesSheet.tsx` — demo fallback for service catalog
2. `src/hooks/useUpdateAppointmentServices.ts` — demo short-circuit on save
3. `src/components/dock/appointment/DockAppointmentDetail.tsx` — read persisted demo service overrides
4. `src/hooks/dock/useDockAppointments.ts` — merge `dock-demo-services::*` overrides into demo appointment data

