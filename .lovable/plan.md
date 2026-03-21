

## Add Labels to Swipe Action Buttons

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

Change each circular icon button into a vertical stack (icon + tiny label below) so the actions are self-explanatory at a glance.

### Changes

1. **Button layout:** Switch from plain icon circles to `flex-col` layout with icon on top and a `text-[9px] font-medium mt-0.5` label below ("Done" / "Client")
2. **Button size:** Increase from `w-11 h-11` to `w-12 h-14` (pill shape via `rounded-2xl`) to accommodate the label
3. **Tray width:** Increase from 140px to 152px (and terminal from 64 to 72) to give breathing room
4. **Open offset:** Adjust from -140 to -152 (terminal -72) to match

Labels keep it concise: **"Done"** for complete, **"Client"** for view client.

