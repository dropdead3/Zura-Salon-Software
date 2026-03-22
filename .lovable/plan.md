

## Fix Active Appointment Times & Add "Start Appt" Action

### Two Issues

1. **Demo data times are wrong for "Active" display**: The screenshot shows Amanda Park (7:05 AM) and Maria Gonzalez (5:05 AM) in Active — but these are `completed` status appointments that got grouped as Active because `has_mix_session` is true. Their times are hours in the past, not "now." The demo data needs fixing so Active appointments have realistic current-window times, and completed appointments with mix sessions should stay in Completed.

2. **No way to start a Scheduled appointment**: Currently, only "Finish Appt" exists as a swipe action. Stylists need a way to move a Scheduled appointment into Active when the client arrives early. A swipe-right "Start Appt" action on Scheduled cards solves this.

### Changes

**1. Fix grouping logic — `DockScheduleTab.tsx`**
- Remove `a.has_mix_session` from the Active grouping condition. Having a mix session doesn't mean the appointment is still active — completed appointments can have mix sessions too.
- Active = `checked_in` or `in_progress` only.

**2. Fix demo data — `dockDemoData.ts`**
- Make demo-appt-4 (Amanda Park) and demo-appt-6 (Maria Gonzalez) stay as `completed` without incorrectly appearing as Active.
- Add a second active appointment (e.g., `checked_in` status with times around "now") so the demo shows multiple active cards realistically.

**3. Add "Start Appt" swipe action — `DockAppointmentCard.tsx`**
- For Scheduled appointments (not active, not terminal): swipe-left reveals a "Start Appt" button (blue/violet themed) instead of "Finish Appt."
- Tapping "Start Appt" calls the existing `update-phorest-appointment` edge function with status `CHECKED_IN`, moving the appointment into Active.
- Add a new `onStart` callback prop alongside `onComplete`.

**4. Wire up start handler — `DockScheduleTab.tsx`**
- Create a start appointment handler using `supabase.functions.invoke('update-phorest-appointment', { body: { appointment_id, status: 'CHECKED_IN' } })`.
- Pass it as `onStart` to `DockAppointmentCard` for scheduled cards.
- Could reuse a pattern similar to `useDockCompleteAppointment` or inline the mutation.

### Card Swipe Summary

| Status | Swipe Left Action |
|---|---|
| Scheduled | "Start Appt" (blue) → moves to Active |
| Active (checked_in/in_progress) | "Finish Appt" (green) → completes |
| Completed/Cancelled | No swipe |

### Files Modified
- `src/components/dock/schedule/DockScheduleTab.tsx` — fix grouping, wire onStart
- `src/components/dock/schedule/DockAppointmentCard.tsx` — add Start Appt action for scheduled cards
- `src/hooks/dock/dockDemoData.ts` — fix demo times/statuses
- New hook or inline mutation for starting appointments

