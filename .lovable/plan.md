

## Close 3 Service-Editing Gaps

### 1. Status Guards — Block Edits on Completed/Cancelled Appointments

**Files:** `EditServicesDialog.tsx`, `DockAppointmentDetail.tsx`, `AppointmentDetailSheet.tsx`

- Add a `disabled` prop to `EditServicesDialog` (or simply don't render the edit trigger)
- In all 3 surfaces (Schedule detail sheet, Dock detail, Hub drawer), hide/disable the edit pencil when `appointment.status` is `completed`, `cancelled`, or `no_show`
- In the edge function (`update-phorest-appointment`), add a server-side guard: if the resolved appointment's status is `completed`/`cancelled`/`no_show`, reject service updates with a clear error message

### 2. End-Time Recalculation

**File:** `supabase/functions/update-phorest-appointment/index.ts`

When `services` are provided and `totalDuration > 0`, recalculate `end_time` from the existing `start_time`:
- After resolving the target table/row, fetch `start_time` from the appointment
- Compute new `end_time = start_time + totalDuration minutes`
- Add `end_time` to the `localUpdate` object
- This ensures the schedule grid reflects the updated duration

### 3. Hub Appointments List — Edit Services from Detail Drawer

**File:** `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx`

- Import `EditServicesDialog`, `useUpdateAppointmentServices`, `Pencil` icon
- Add a pencil icon button next to the service name in the drawer header (~line 239)
- Wire to `EditServicesDialog` with the same pattern used in Schedule and Dock
- Apply the same status guard (hide pencil for completed/cancelled/no_show)

### Summary of Changes

| File | Change |
|------|--------|
| `update-phorest-appointment/index.ts` | Status guard + end_time recalculation |
| `EditServicesDialog.tsx` | No changes needed |
| `AppointmentDetailSheet.tsx` | Hide edit pencil when status is terminal |
| `DockAppointmentDetail.tsx` | Hide edit pencil when status is terminal |
| `AppointmentDetailDrawer.tsx` | Add edit services trigger + dialog |

