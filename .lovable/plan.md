

## Add Multi-Client Safety Guard to Batch Actions

### Problem

When a user searches by name (e.g., "Eric Day") and selects all results, the batch actions (Cancel Selected, Cancel All Future, status updates) operate on all selected appointments without checking whether they belong to the **same client** or **different clients who share the same name**. This is a data integrity risk.

### Solution

Add a multi-client detection guard to the `AppointmentBatchBar` that:

1. **Detects distinct clients** across the selection using `phorest_client_id` (phorest source) or `client_id` (local source) as the unique identifier
2. **Shows a warning badge** in the batch bar when multiple distinct client IDs are detected (e.g., "2 different clients")
3. **Adds a warning to confirmation dialogs** when the action would affect appointments belonging to different clients, requiring the user to acknowledge the risk
4. **Displays a client ID column** -- adds a "Client ID" attribute visible in the appointment detail drawer so operators can distinguish same-name clients

### Changes

#### 1. AppointmentBatchBar.tsx -- Multi-Client Detection + Warning

- Compute `uniqueClientIds` from the selected appointments:
  ```
  For each appointment:
    - phorest source -> use phorest_client_id
    - local source -> use client_id
    - if neither exists (walk-in) -> treat as unique unknown
  ```
- If `uniqueClientIds.size > 1`, render an amber warning badge next to the selection count: "Includes 2 different clients"
- In both cancel AlertDialogs, when multiple clients are detected:
  - Add an amber warning block: "These appointments belong to {N} different clients with the same or similar name. Verify you intend to affect all of them."
  - Require an additional acknowledgment (the existing confirm button still works, but the warning is prominent)
- Apply the same warning to the status update dropdown (show a toast warning before executing if multiple clients detected)

#### 2. AppointmentDetailDrawer.tsx -- Show Client ID

- In the Summary tab's client info section, add a "Client ID" row displaying the `phorest_client_id` or `client_id` value
- This gives operators a way to visually distinguish same-name clients when reviewing individual appointments
- Use muted styling and a copyable format (click to copy)

### Files Modified

- `src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx` -- multi-client detection logic, warning badge, enhanced AlertDialog copy
- `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` -- client ID display in summary tab

### What Does NOT Change

- No database changes needed
- No new hooks or queries (client IDs already exist on the appointment objects)
- Existing batch action logic remains the same -- the guard is purely a UI warning layer
- Single-client selections see no change in behavior
