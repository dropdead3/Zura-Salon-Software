

## Move "Add Appointment" Button into Hamburger Menu

**Goal:** Remove the inline "Add Appointment" button from the schedule scroll area and place it as a quick action in the hamburger menu, decluttering the working screen.

### Change 1 — `src/components/dock/DockHamburgerMenu.tsx`

1. Add `onAddAppointment` callback to props interface
2. Import `Plus` icon from lucide-react
3. Add a new "Quick Actions" section between the tab items and the divider/Lock Station area:
   - A violet-themed "Add Appointment" button with `Plus` icon, matching the existing tab item styling but with violet accent (similar to how the active tab looks)
   - On click: call `onAddAppointment()` and close the menu

### Change 2 — `src/components/dock/schedule/DockScheduleTab.tsx`

1. Remove the inline `<button>` block (lines 242-248) that renders "Add Appointment"
2. The `setShowNewBooking(true)` trigger will now be called from the hamburger menu callback instead

### Change 3 — `src/components/dock/DockLayout.tsx`

1. Lift `showNewBooking` state (or pass a callback) so the hamburger menu can trigger the new booking sheet
2. Pass `onAddAppointment` prop to `DockHamburgerMenu`
3. Wire it to open the `DockNewBookingSheet` (the same sheet currently triggered from the schedule tab)

**Result:** The schedule screen starts directly with the Active/Upcoming appointment groups, and "Add Appointment" lives in the hamburger menu as a quick action.

