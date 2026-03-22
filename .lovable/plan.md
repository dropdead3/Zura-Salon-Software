

## Add Cancel & No-Show Action Buttons for Scheduled Appointments

**Problem:** Scheduled (not-yet-started) appointments only have a "Start Appt" swipe action. Staff need quick access to Cancel and No-Show actions with confirmation dialogs.

**Approach:** Widen the swipe tray to fit 3 buttons side-by-side for scheduled appointments. Add confirmation dialogs. Wire status changes through the same edge function used by "Start Appt".

### Changes

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

1. **Add new props** `onCancel` and `onNoShow` to the interface
2. **Widen tray for scheduled cards** — increase `OPEN_OFFSET` dynamically: scheduled cards get ~320px tray (3 buttons), active cards keep 128px (1 button)
3. **Add Cancel and No-Show buttons** alongside "Start Appt" in the scheduled tray section:
   - Cancel: red-tinted button with X icon, "Cancel" label
   - No-Show: amber-tinted button with UserX icon, "No Show" label
   - Start: existing blue button stays
4. **Import** `XCircle`, `UserX` from lucide-react

**File: `src/components/dock/schedule/DockScheduleTab.tsx`**

5. **Add confirmation dialog state** — track which appointment is pending cancel/no-show with a state like `{ appointment, action: 'cancel' | 'no_show' }`
6. **Add handler functions** `handleCancelAppointment` and `handleNoShowAppointment`:
   - Show AlertDialog asking for confirmation ("Are you sure you want to cancel [Client]'s appointment?" / "Mark [Client] as a no-show?")
   - On confirm, invoke `update-phorest-appointment` with `status: 'CANCELLED'` or `status: 'NO_SHOW'`
   - Invalidate query caches, show success toast
   - Demo appointments get a toast-only response
7. **Pass `onCancel` and `onNoShow`** through `AppointmentGroup` to `DockAppointmentCard`
8. **Render AlertDialog** at the bottom of the component for the confirmation modal

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`** (layout detail)

The scheduled tray layout will be:

```text
┌────────────┬────────────┬────────────┐
│   Cancel   │  No Show   │ Start Appt │
│   (red)    │  (amber)   │   (blue)   │
└────────────┴────────────┴────────────┘
```

Each button: ~100px wide, same height styling as current "Start Appt". The tray width increases from 128px to ~320px for scheduled appointments only. Active cards keep the existing single "Finish Appt" button.

### Confirmation Dialogs

- **Cancel:** "Cancel Appointment — Are you sure you want to cancel [Client Name]'s appointment? This action will update the schedule and POS." Actions: "Keep Appointment" / "Yes, Cancel"
- **No-Show:** "Mark as No-Show — Mark [Client Name] as a no-show? This will be reflected in the schedule and client history." Actions: "Go Back" / "Mark No-Show"

Four total modifications across two files. No new files needed — uses existing `AlertDialog` from shadcn.

