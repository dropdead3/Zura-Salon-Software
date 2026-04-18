

## Clarify scope + remove HospitalityBlock from client-facing booking wizard

### Confirming your mental model
Yes — terminology check passes:
- **Booking Wizard** = client-facing booking flow (public, unauthenticated clients booking themselves). Personal context / hospitality data is internal staff intelligence — does **not** belong here.
- **Appointment Drawer** = staff-side popover when clicking an appointment on the schedule. This is where `HospitalityBlock` legitimately lives.

The previous edit touched `src/components/dashboard/schedule/booking/ClientProfileView.tsx` — need to verify whether that file is the staff-side drawer profile view or the client-facing wizard. The `/booking/` path suggests wizard; the `/dashboard/schedule/` parent suggests staff. I'll confirm before ripping anything out.

### Investigation needed (read-only)
1. `src/components/dashboard/schedule/booking/ClientProfileView.tsx` — confirm whether this renders inside the public booking wizard or the staff-facing new-appointment flow.
2. Locate the actual appointment drawer (likely `src/components/dashboard/appointment-drawer/AppointmentDetailSheet.tsx` per earlier conversation) and confirm `HospitalityBlock` placement + spacing there.
3. Check public booking entry (likely `/book/:orgSlug` route, `src/pages/PublicBooking.tsx` or similar) to verify `HospitalityBlock` isn't rendered on the public surface.

### Likely fix (pending investigation)
- **If** `ClientProfileView.tsx` is client-facing wizard → remove the `HospitalityBlock` block entirely from that file.
- **Then** apply the spacing fix (parent `space-y-4`) to the actual staff appointment drawer instead.

### Out of scope
- No changes to `HospitalityBlock` internals.
- No changes to other booking wizard steps.

### Verification
- Open public booking wizard as a client → confirm no "Personal Context" card appears.
- Open appointment drawer on schedule → confirm card present with symmetric 16px spacing above and below.

Approve and I'll investigate, confirm which file is which, then ship the correct fix.

