

## Appointment Panel Action Clarity Redesign

### The Problem

The current panel has two action zones with no clear rationale for placement:
- **Top ellipsis**: 4 items (client link, reassign, revert, delete)
- **Bottom footer**: Up to 6 buttons wrapping across 3 rows (confirm, check in, pay, reschedule, rebook, transactions, no show, cancel)

Users cannot predict where to find an action. The footer is visually overwhelming.

### The Solution: Clear Two-Zone Model

Establish a simple mental model:

```text
Ellipsis Menu = "What else can I do?"  (operations, navigation, admin)
Footer Bar    = "What happens next?"   (lifecycle transitions only)
```

---

### Zone 1: Footer Bar (Lifecycle Only)

The footer becomes a **focused lifecycle bar** showing only status transitions -- the answer to "what is the next step for this appointment?"

| Current Status | Primary CTA | Secondary |
|---|---|---|
| Booked | Confirm | -- |
| Confirmed | Check In | -- |
| Checked In | Pay / Complete | -- |
| Completed | (no actions) | -- |
| Cancelled / No Show | (no actions) | -- |

- **One primary button** (filled), never more than two
- Cancel and No Show move OUT of the footer into the ellipsis menu (they are not "next steps" -- they are overrides)
- Reschedule, Rebook, and Transactions move OUT of the footer into the ellipsis menu
- The footer shrinks from 6 wrapped buttons to 1-2 clean buttons on a single row
- When no transitions are available (completed/cancelled), the footer is hidden entirely

### Zone 2: Ellipsis Menu (Everything Else, Grouped)

The ellipsis menu becomes the canonical home for all operational actions, organized with `DropdownMenuSeparator` and `DropdownMenuLabel` group headers:

```text
--- Actions ---
Reschedule
Rebook
Reassign Stylist          (manager/admin only)

--- Navigate ---
View in Client Directory
Transactions

--- Status Override ---
No Show                   (destructive style)
Cancel                    (destructive style)
Revert to Booked          (manager/admin, confirmed only)

--- Admin ---
Delete Appointment        (destructive, permission-gated)
```

- Each group has a subtle label header (font-sans, text-[10px], text-muted-foreground, uppercase tracking)
- Destructive items use `text-destructive` styling
- Permission gates remain unchanged -- items simply don't render if the user lacks access
- The menu is always visible (the gate condition already includes `resolvedClientId`)

---

### Visual Result

**Before:**
- Top: small ellipsis with 4 items
- Bottom: 6 buttons across 3 wrapped rows

**After:**
- Top: organized ellipsis with grouped actions (clear labels, logical sections)
- Bottom: 1 prominent lifecycle CTA (or hidden when not applicable)
- Single row, no wrapping, no confusion

---

### Technical Details

**File modified:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**Changes:**

1. **Footer bar** (~lines 1639-1697):
   - Remove: Reschedule, Rebook, Transactions, No Show, Cancel buttons
   - Keep: Confirm, Check In, Pay/Complete (lifecycle transitions only)
   - Add: `hidden` when no transitions are available (completed/cancelled/no_show states)
   - Simplify flex layout -- no wrapping needed with 1-2 buttons

2. **Ellipsis menu** (~lines 860-901):
   - Add `DropdownMenuLabel` for group headers: "Actions", "Navigate", "Status", "Admin"
   - Add `DropdownMenuSeparator` between groups
   - Move Reschedule into Actions group (onClick calls `onReschedule`)
   - Move Rebook into Actions group (onClick calls `onRebook`)
   - Move Transactions into Navigate group (Link to `/dashboard/appointments-hub`)
   - Move No Show into Status group (destructive styling, calls `handleStatusChange('no_show')`)
   - Move Cancel into Status group (destructive styling, calls `handleStatusChange('cancelled')`)
   - Existing items (View in Client Directory, Reassign Stylist, Revert to Booked, Delete) stay in their new groups

3. **Imports**: Add `DropdownMenuLabel`, `DropdownMenuSeparator` to the existing dropdown import if not already present

