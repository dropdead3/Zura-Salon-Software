
## Cancel and Delete: Role-Based Access Control for Appointments

### What We're Building

Refining the approved Cancel vs Delete architecture with two stylist-specific access rules:

1. **Stylists can only cancel their own appointments** (where they are the assigned stylist)
2. **Stylists can delete their own appointments within 10 minutes of creation** (mistake correction window), with toast warnings

Admins/managers retain full cancel and delete access.

---

### Changes

#### 1. Cancel Button -- Stylist Ownership Guard

**File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`**

Add a `canCancel` check before the Cancel button renders:

- If the user's role is stylist-only (no admin/manager/super_admin role), only show Cancel when `appointment.stylist_user_id === user.id`
- Admins/managers/super_admins can cancel any appointment (existing behavior unchanged)
- Same ownership rule applies to the "Cancel All Future Recurring" action

Logic:
```text
isStylistOnly = user has stylist role but NOT admin/manager/super_admin
isOwnAppointment = appointment.stylist_user_id === user.id
canCancel = isManagerOrAdmin OR isOwnAppointment
```

The Cancel button's existing `availableTransitions.includes('cancelled')` check gets an additional `&& canCancel` guard.

#### 2. Delete Button -- 10-Minute Window for Stylists

**Same file: `AppointmentDetailSheet.tsx`**

Add a Delete action in a secondary overflow menu (three-dot `MoreHorizontal` icon) at the top-right of the detail panel header:

- **Admins/managers**: Can delete any appointment with status `booked` or `pending` (no time restriction)
- **Stylists**: Can delete only appointments they created (`created_by === user.id`) AND only within 10 minutes of `created_at`

Delete is a soft-delete: sets `deleted_at` and `deleted_by` on the record.

**10-minute window logic:**
```text
createdAt = new Date(appointment.created_at)
minutesSinceCreation = (Date.now() - createdAt.getTime()) / 60000
canStylistDelete = appointment.created_by === user.id && minutesSinceCreation <= 10
```

**Toast warnings for stylists:**
- When a stylist opens an appointment they created < 10 min ago, no extra indicator needed
- When a stylist clicks Delete and 7-10 minutes have passed: warning toast -- "You have less than 3 minutes remaining to delete this appointment"
- When a stylist clicks Delete after 10 minutes: error toast -- "The 10-minute deletion window has expired. Contact a manager to remove this appointment."
- On successful delete: success toast -- "Appointment deleted. This was removed as a data entry correction."

#### 3. Database Migration -- Soft Delete Columns

Add two columns to `phorest_appointments`:
```sql
ALTER TABLE public.phorest_appointments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
```

Also add the same to the local `appointments` table for consistency:
```sql
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
```

#### 4. Delete Confirmation Dialog

A destructive confirmation dialog (AlertDialog) for the delete action:

- Title: "Delete Appointment?"
- Description differs by role:
  - Admin: "This will permanently remove this appointment from all records. This is not a cancellation -- no fee or notification will be applied."
  - Stylist: "This will remove this appointment as a data entry correction. This action cannot be undone."
- Buttons: "Go Back" | "Delete" (destructive red styling)

#### 5. Query Updates -- Exclude Soft-Deleted Records

Update the appointment fetching queries (in `useAppointmentsHub` and schedule hooks) to filter out `deleted_at IS NOT NULL` records so soft-deleted appointments no longer appear on calendars, lists, or analytics.

---

### Technical Details

**Files to modify:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` -- Add cancel ownership guard, delete button in overflow menu, delete confirmation dialog, toast logic
- Appointment query hooks -- Add `deleted_at` IS NULL filter

**New database migration:**
- Add `deleted_at` and `deleted_by` columns to both `phorest_appointments` and `appointments` tables

**Access control summary:**

| Action | Stylist (own appt) | Stylist (other's appt) | Admin/Manager |
|--------|-------------------|----------------------|---------------|
| Cancel | Yes | No | Yes |
| Delete (within 10 min, own creation) | Yes | No | N/A |
| Delete (after 10 min) | No | No | Yes |
| Delete (completed appts) | No | No | No |

**No new edge functions needed** -- cancel remains a client-side status update; delete is a simple soft-delete column update. Fee policy enforcement (from the broader plan) will be a separate phase.
