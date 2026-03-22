

## Widen Action Buttons with Internal Padding

**Problem:** The button widths and tray offsets were updated, but the button text ("START APPT", "CANCEL", etc.) still touches the button edges because the buttons lack internal horizontal padding — they only use `items-center justify-center` with fixed widths.

### Changes — `src/components/dock/schedule/DockAppointmentCard.tsx`

1. **Increase tray offsets** to give more total breathing room:
   - `ACTIVE_OPEN_OFFSET`: `-148` → `-160`
   - `SCHEDULED_OPEN_OFFSET`: `-370` → `-400`

2. **Increase button widths:**
   - Finish Appt: `w-[132px]` → `w-[144px]`
   - Cancel / No Show / Start: `w-[112px]` → `w-[120px]` each

3. **Add horizontal padding** `px-2` to each button so text has internal breathing room from the button borders.

4. **Increase tray right padding** from `pr-2` → `pr-3` to prevent the rightmost button from clipping against the card edge.

Single file, class-level adjustments only. No logic changes.

