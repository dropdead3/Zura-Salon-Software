

## Add Cancel Appointment Capabilities to Appointments Hub

### Current State

The **Schedule page's** `AppointmentDetailSheet` already has robust cancellation:
- Single cancel with AlertDialog + reason textarea
- Cancel all future recurring with AlertDialog + reason textarea  
- Audit log firing on cancel
- Proper confirmation flow

The **Appointments Hub** has zero cancellation capability:
- The detail drawer (`AppointmentDetailDrawer`) has no cancel button
- The batch bar (`AppointmentBatchBar`) has "cancelled" buried in the generic status dropdown but no dedicated cancel actions with confirmation
- Neither surface has a "Cancel All Future" option

### Changes

#### 1. AppointmentDetailDrawer.tsx -- Add Cancel Button

Add a "Cancel Appointment" button at the bottom of the Summary tab (after the Communications placeholder), visible only when status is not already `cancelled` or `completed`:

- Button opens an `AlertDialog` with:
  - Title: "Cancel this appointment?"
  - Description: "This will cancel {clientName}'s appointment on {date}. The client may need to be notified."
  - Optional reason `Textarea`
  - "Go Back" and "Cancel Appointment" actions
- On confirm: updates the correct table (`phorest_appointments` or `appointments`) based on `_source` tag
- Invalidates `appointments-hub` query cache
- Shows success toast, closes drawer
- Destructive styling on confirm button

#### 2. AppointmentBatchBar.tsx -- Add Dedicated Cancel Actions

Add two new buttons to the batch bar (replacing the buried dropdown option):

**"Cancel Selected"** button:
- Destructive outline styling with `XCircle` icon
- Opens AlertDialog: "Cancel {N} selected appointments?"
- Description: "This will cancel all selected appointments. Cancelled appointments cannot be automatically restored."
- On confirm: reuses existing `handleBulkStatusUpdate('cancelled')` logic
- Clears selection after success

**"Cancel All Future"** button:
- Only visible when at least one selected appointment has `appointment_date >= today`
- Opens AlertDialog showing count of future appointments
- Filters `selectedAppointments` to only those with future dates before updating
- Updates only the future subset, not past appointments

#### 3. Remove "cancelled" from generic status dropdown

Since cancellation now has its own dedicated buttons with confirmation dialogs, remove the `cancelled` option from the `Select` dropdown to prevent accidental cancellation without confirmation.

### Technical Details

- No database changes needed -- uses existing `phorest_appointments` and `appointments` tables
- `AlertDialog` imported from `@/components/ui/alert-dialog` (already in project)
- Date filtering uses simple ISO string comparison: `appointment.appointment_date >= new Date().toISOString().split('T')[0]`
- Copy follows governance tone -- advisory, no shame language
- All buttons use `tokens.button.inline` sizing consistent with existing batch bar
- Font weight stays at `font-medium` maximum per typography rules
- `XCircle` icon from lucide-react for cancel actions

### Files Modified

- `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` -- add cancel button + AlertDialog
- `src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx` -- add Cancel Selected, Cancel All Future buttons + AlertDialogs, remove cancelled from dropdown

