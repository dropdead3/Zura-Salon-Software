

## Fix: Delete Button Not Showing for Account Owners

### Root Cause

The `canDelete` logic on line 526 of `AppointmentDetailSheet.tsx` restricts deletion to only `booked` or `pending` status appointments:

```
if (!['booked', 'pending'].includes(appointment.status)) return false;
```

The appointment in the screenshot has `confirmed` status, so this check returns `false` before the admin/owner check on line 527 ever runs. The delete overflow menu is hidden entirely.

### Fix

**File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`** (lines 524-534)

Restructure the `canDelete` logic so that:

1. **Block deletion of completed/checked-in appointments** for everyone (financial records must remain)
2. **Admins/managers/super_admins (account owners)**: Can delete any appointment that is not completed or checked-in -- including `confirmed`, `booked`, `pending`, and `no_show` statuses
3. **Stylists**: Same 10-minute window rule, but only on `booked` or `pending` (not confirmed, since confirmation implies client interaction)

Updated logic:

```
const canDelete = useMemo(() => {
  if (!appointment || ['completed', 'checked_in'].includes(appointment.status)) return false;
  if (isManagerOrAdmin) return true;
  if (isStylistOnly && ['booked', 'pending'].includes(appointment.status) && appointment.created_by === user?.id) {
    const createdAt = new Date(appointment.created_at);
    const minutesSinceCreation = (Date.now() - createdAt.getTime()) / 60000;
    return minutesSinceCreation <= 10;
  }
  return false;
}, [appointment, isManagerOrAdmin, isStylistOnly, user?.id]);
```

### What Changes

- The `['booked', 'pending']` status gate is moved from the global check to only apply to the stylist branch
- Admins/owners now see the three-dot overflow menu with "Delete Appointment" on any non-completed appointment
- No other files need changes

### Single file edit, one logic block.

