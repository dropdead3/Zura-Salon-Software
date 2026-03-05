

## Fix: Time Slot Clicks Should Route Admin-Only Users to Meeting Wizard

### Problem
`handleSlotClick` (line 427) always opens the **client booking wizard** (`setBookingOpen(true)`) regardless of the user's role. So when Eric (admin-only) clicks a time slot on the grid, it opens a client booking flow he shouldn't be using. The role-branching logic exists in `handleNewBooking` but was never applied to `handleSlotClick`.

### Fix (single file: `Schedule.tsx`)

Apply the same role-based branching from `handleNewBooking` to `handleSlotClick`:

1. **Admin-only user clicks a slot** → Open meeting wizard (`setMeetingWizardOpen(true)`) with the clicked time pre-filled as a default
2. **Dual-role user clicks a slot** → Open the type selector (`setTypeSelectorOpen(true)`) so they choose between client booking and meeting, with the clicked time stored for whichever path they pick
3. **Service provider (no admin)** → Current behavior (open booking wizard directly)

Additionally, store the clicked slot's date/time so the meeting wizard can pre-populate its fields when opened from a slot click (rather than the header button which has no time context).

```text
handleSlotClick flow (after fix):
  ┌─ Admin only     → setMeetingWizardOpen(true) with time defaults
  ├─ Admin + Provider → setTypeSelectorOpen(true) with time defaults
  └─ Provider only   → setBookingOpen(true) (existing behavior)
```

**One file modified:** `src/pages/dashboard/Schedule.tsx` — ~10 lines changed in `handleSlotClick` at lines 470-476.

