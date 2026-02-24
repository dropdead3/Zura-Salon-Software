

## Confirmation Gate: Require Client Acknowledgment Before Confirming

### What This Solves

Appointments can be marked "Confirmed" with a single click, even when no one has communicated with the client. This creates false confidence in the schedule. After this change, staff must declare **how the client was informed** before confirmation proceeds.

### Changes

#### 1. Confirmation Method Dialog (AppointmentDetailSheet.tsx)

When clicking "Confirm" on a booked/pending appointment:
- A dialog opens requiring the staff to select a communication method
- Methods: "Called Client", "Texted Client", "Client Confirmed Online", "Spoke In Person"
- A mandatory checkbox: "Client has been informed and acknowledged"
- Optional notes field
- "Mark as Confirmed" button stays disabled until the checkbox is checked
- Walk-in appointments (no `phorest_client_id` and no `client_name`) auto-select "In Person" and pre-check the acknowledgment

New state variables:
- `showConfirmGate` (boolean)
- `confirmMethod` (string)
- `confirmNote` (string)
- `confirmAcknowledged` (boolean)

The `handleStatusChange` function will intercept `'confirmed'` status and open the dialog instead of directly changing status. On submit, it fires `onStatusChange` and logs the audit event with `confirmation_method` and `confirmation_note` in metadata.

#### 2. Schedule.tsx -- Gate the Action Bar Confirm Path

The `handleConfirm` on line 462 also calls `handleStatusChange('confirmed')` directly. Since `AppointmentDetailSheet` is the component that renders the confirm button and has the dialog, and `handleConfirm` in Schedule.tsx is wired through the same `onStatusChange` prop, the gate is already enforced through the detail sheet's footer. No changes needed in Schedule.tsx.

#### 3. Confirmation Source Display (AppointmentDetailSheet.tsx)

When an appointment is in `confirmed` status, show an inline indicator below the status badge area:
- Queries the audit log for the `status_changed` event with `new_value.status === 'confirmed'`
- Extracts `confirmation_method` from `metadata`
- Displays: icon + "Confirmed via Phone Call" (or Text, Online, In Person)
- Falls back to "Confirmed (method unknown)" for legacy appointments

Method display map:
- `called` -- Phone icon + "Phone Call"
- `texted` -- MessageSquare icon + "Text Message"
- `online` -- Globe icon + "Online"
- `in_person` -- User icon + "In Person"

#### 4. Confirmation Method in Appointments Hub (AppointmentDetailDrawer.tsx)

Update the existing `confirmationEvent` query (line 131-156) to also extract `metadata.confirmation_method` from the audit log. Replace the current `'Manual'` fallback with the actual method label.

#### 5. Revert-to-Booked Path (Admin Only)

Add a "Revert to Booked" option in the overflow menu (MoreHorizontal dropdown) for admin/manager roles when the appointment is in `confirmed` status. This handles accidental confirmations without requiring a full cancel/rebook cycle.

### Files Modified

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` -- Confirmation dialog, confirmation source display, revert-to-booked option
- `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` -- Extract and display confirmation method from audit metadata

### Technical Details

```text
Staff clicks "Confirm"
  |
  +--> Is walk-in? --> Pre-select "In Person", pre-check acknowledgment
  |
  +--> Dialog opens with radio group for method selection
  |
  +--> Staff selects method + checks "Client informed" box
  |
  +--> "Mark as Confirmed" enabled
  |
  +--> On submit:
         1. fireAuditLog('status_changed', {status: 'booked'}, {status: 'confirmed'}, 
              {confirmation_method: 'called', confirmation_note: '...'})
         2. onStatusChange(appointment.id, 'confirmed')
         3. Close dialog
```

No database schema changes required -- the existing `metadata` JSONB column on `appointment_audit_log` stores the confirmation method.

