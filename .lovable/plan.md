

## Fix: Newly Added Services Not Appearing in Formulations Tab

### Root Cause

`DockServicesTab` derives its service list from `appointment.service_name` (line 147), which is the original prop value. When services are edited:

1. **Demo mode**: The updated service string is saved to `sessionStorage` (`dock-demo-services::${id}`), but `DockServicesTab` never reads this override — it always uses the stale `appointment.service_name`.
2. **Real mode**: Query invalidation fires, but since the `appointment` object is passed as a prop from `DockLayout → DockAppointmentDetail → DockServicesTab`, it may not refresh until the parent re-renders with fresh data.

The fix for demo mode (the immediate bug you're seeing) is straightforward. Real mode likely already works because query invalidation refreshes the appointment list.

### Changes

**`src/components/dock/appointment/DockAppointmentDetail.tsx`**
- Pass `effectiveServiceName` to `DockServicesTab` as a new prop so it uses the demo-overridden service string

**`src/components/dock/appointment/DockServicesTab.tsx`**
- Add an optional `effectiveServiceName` prop
- Use `effectiveServiceName ?? appointment.service_name` when computing `chemicalServices` (line 147)
- This ensures newly added color/chemical services appear immediately after saving in the Edit Services sheet

### Two files changed

