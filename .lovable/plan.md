

## Multi-Client Resolution Dialog for Batch Actions

### Problem

The current multi-client warning is a passive amber badge and text block. When an operator selects appointments for "Eric Day" that actually belong to 2+ different clients (same name, different customer IDs), the only safeguard is a warning message. There is no way to review which appointments belong to which client and selectively exclude one client's appointments before executing the action.

### Solution

Replace the passive warning with an interactive **Multi-Client Resolution Dialog** that opens automatically when a batch action is triggered on appointments belonging to different clients. The dialog groups appointments by client identity, shows each client's Customer ID (ZU-XXXXX), and lets the operator check/uncheck entire client groups before confirming.

### User Flow

```text
1. Operator selects 5 appointments for "Eric Day"
2. Operator clicks "Cancel Selected"
3. System detects 2 different client IDs in the selection
4. Instead of the standard confirmation, a Resolution Dialog opens:

   ┌──────────────────────────────────────────────────┐
   │  Multiple Clients Detected                       │
   │                                                  │
   │  Your selection includes appointments for 2      │
   │  different clients. Choose which to include.     │
   │                                                  │
   │  ☑ Eric Day  ·  ZU-00042  ·  3 appointments     │
   │    02/24 5:00 PM  ·  Confirmed                   │
   │    02/24 3:30 PM  ·  Confirmed                   │
   │    02/24 1:00 PM  ·  Confirmed                   │
   │                                                  │
   │  ☑ Eric Day  ·  ZU-01287  ·  2 appointments      │
   │    02/22 2:15 PM  ·  Confirmed                   │
   │    02/22 12:30 PM ·  Confirmed                   │
   │                                                  │
   │            [Go Back]  [Cancel 5 Appointments]    │
   └──────────────────────────────────────────────────┘

5. Operator unchecks one client group (e.g., ZU-01287)
6. Button updates: "Cancel 3 Appointments"
7. Operator confirms -- only the checked group is affected
```

### Technical Changes

#### 1. New Component: `MultiClientResolutionDialog.tsx`

Location: `src/components/dashboard/appointments-hub/MultiClientResolutionDialog.tsx`

- Receives: `appointments`, `action` (cancel/status update), `actionLabel`, `onConfirm(filteredAppointments)`, `onCancel`
- Groups appointments by client identity (phorest_client_id or client_id, walk-ins grouped separately)
- Each group shows:
  - Checkbox to include/exclude the entire group
  - Client name + Customer Number (ZU-XXXXX) badge
  - Appointment count
  - Collapsible list of individual appointments (date, time, status)
- Confirm button dynamically updates count based on checked groups
- At least one group must be checked to proceed

#### 2. Updated: `AppointmentBatchBar.tsx`

- Add state: `resolutionDialogOpen`, `pendingAction` (tracks which action triggered it)
- When any destructive/update action is triggered and `isMultiClient === true`:
  - Instead of opening the existing AlertDialog or firing the status update directly, open the `MultiClientResolutionDialog`
  - Pass the pending action type and callback
- When `isMultiClient === false`: behavior is unchanged (existing AlertDialogs work as-is)
- Remove the inline `MultiClientWarning` component from the AlertDialogs (no longer needed -- the resolution dialog replaces it)
- Keep the amber badge in the batch bar as a passive indicator

#### 3. Action Flow Changes

| Action | Single Client | Multi Client |
|--------|--------------|--------------|
| Status Update (dropdown) | Direct execute | Resolution Dialog, then execute on confirmed subset |
| Cancel Selected | AlertDialog | Resolution Dialog, then execute on confirmed subset |
| Cancel All Future | AlertDialog | Resolution Dialog (filtered to future only), then execute on confirmed subset |
| Export CSV | Direct execute (no risk) | Direct execute (no risk) |
| Share | Direct execute (no risk) | Direct execute (no risk) |

### Files Modified

- **New:** `src/components/dashboard/appointments-hub/MultiClientResolutionDialog.tsx` -- resolution dialog component
- **Edit:** `src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx` -- intercept actions when multi-client, delegate to resolution dialog

### What Does NOT Change

- Single-client batch actions behave exactly as they do today
- No database changes
- No hook changes (customer_number is already enriched)
- Export CSV and Share actions are unaffected (non-destructive)
- The amber "N different clients" badge remains in the batch bar as a passive indicator
