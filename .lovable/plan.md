

## Widen Action Buttons — Add Horizontal Padding

**Problem:** "Finish Appt" and "Start Appt" text nearly touches the button edges. Buttons need more horizontal breathing room.

### Changes — `src/components/dock/schedule/DockAppointmentCard.tsx`

1. **Increase `SCHEDULED_OPEN_OFFSET`** from `-320` to `-370` (line 56) — gives the 3-button tray 50px more total width
2. **Increase `ACTIVE_OPEN_OFFSET`** from `-128` to `-148` (line 55) — gives the single Finish button 20px more width
3. **Widen individual buttons:**
   - Finish Appt: `w-[112px]` → `w-[132px]` (line 195)
   - Cancel / No Show / Start: `w-[100px]` → `w-[112px]` each (lines 210, 222, 234)
4. **Increase tray inner padding:** `pl-2 pr-1` → `pl-3 pr-2` (line 185)

Single file, class-level width + padding bumps. No logic changes.

