

# Luxury Bento Appointment Detail Panel

## Overview

Replace the current `AppointmentDetailSheet` (Radix Sheet drawer) with a premium floating bento panel matching the `ClientDetailSheet` pattern -- portal-rendered, spring-animated, glass aesthetic, anchored right edge.

## Architecture

The new component will be a full rebuild of `AppointmentDetailSheet.tsx` using:
- `createPortal` to render outside the React tree (same as `ClientDetailSheet`)
- `framer-motion` spring animation (damping: 26, stiffness: 300, mass: 0.8) for slide-in from right
- Glass aesthetic: `bg-card/80 backdrop-blur-xl border-border rounded-xl shadow-2xl`
- Fixed position: `right-4 top-4 bottom-4`, max-width 440px
- Tabbed interior for organized information density

## Panel Layout

### Header
- Client avatar with initials + deterministic color
- Client name (large, font-display)
- Service summary line
- Status badge with dropdown for transitions (reuses existing STATUS_CONFIG)
- Close button (rounded-full, top-right)

### Tabbed Content (3 tabs)

**Tab 1: Details (default)**
- **Appointment Info Card** -- date, time range, duration, location
- **Services Card** -- per-service breakdown with individual durations and prices, total at bottom wrapped in `BlurredAmount`
- **Stylist Card** -- booked stylist avatar + name, preferred stylist comparison (highlight mismatch with amber indicator), assistant stylists section
- **Client Contact Card** -- phone (formatted, tappable), email, copy buttons
- **Confirmation Status** -- visual status timeline showing appointment lifecycle
- **Redo/Recurrence badges** (carried over from current implementation)

**Tab 2: History**
- Client appointment history timeline (reuses `useClientVisitHistory`)
- Visit count, total spend, client tenure
- Preferred services list
- At-risk / new client indicators

**Tab 3: Notes**
- Appointment notes (from `useAppointmentNotes`)
- Client notes (from `useClientNotes`)
- Add note form with private toggle
- Booking notes from POS (read-only)

### Footer Action Bar
Sticky bottom bar with contextual actions based on appointment status:
- **Check In** (when confirmed)
- **Pay / Checkout** (when checked_in)
- **Reschedule** (opens reschedule flow)
- **Rebook** (opens QuickBookingPopover pre-filled with same client + services)
- **Cancel** (with confirmation dialog)
- Status transition dropdown for edge cases

## Data Requirements

All data hooks already exist:
- `useAppointmentNotes` -- appointment-scoped notes
- `useClientNotes` -- client-scoped notes
- `useClientVisitHistory` -- past visit timeline
- `useAppointmentAssistants` -- assistant assignments
- `useAssistantConflictCheck` -- conflict detection for assistant picker
- `usePreferredStylist` -- preferred vs booked comparison
- `useRescheduleAppointment` -- reschedule mutation
- `useFormatCurrency` / `useFormatDate` -- locale-aware formatting

No new database tables or edge functions required.

## Gaps and Enhancements Identified

1. **Preferred vs Booked Stylist Mismatch** -- currently the appointment type lacks `preferred_stylist_id` from the client record. The panel will fetch this via the `phorest_client_id` on the appointment to cross-reference against the booked `stylist_user_id`. An amber "Mismatch" badge will surface when they differ.

2. **Multi-Service Breakdown** -- the current `service_name` field is a single concatenated string. The panel will parse comma/pipe-delimited service names and display them individually. If structured service data becomes available (from `appointment_services` join), it will use that instead.

3. **Rebook Action** -- currently no "rebook" flow exists from the detail panel. This will invoke the `QuickBookingPopover` in panel mode, pre-filled with the same client, location, and services, allowing staff to quickly create a follow-up appointment.

4. **Reschedule Inline** -- the panel will include a date/time picker for quick reschedule without leaving the panel, using the existing `useRescheduleAppointment` hook.

5. **Client Email Missing** -- `PhorestAppointment` has `client_phone` but no `client_email`. The panel will fetch client email from `phorest_clients` using `phorest_client_id` when available.

6. **Status Timeline Visualization** -- a horizontal step indicator showing the appointment's lifecycle (Booked -> Confirmed -> Checked In -> Completed) with the current status highlighted.

7. **No-Show / Cancellation Reason** -- currently no structured field for cancellation reasons. The panel will show a text input when cancelling to capture the reason in the notes field.

## Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Full rewrite: Sheet -> portal-based bento panel with tabs |
| `src/pages/dashboard/Schedule.tsx` | Add rebook callback prop wiring, pass additional handlers |

## Design Token Compliance

- Card containers: `rounded-xl` (tokens.card.wrapper)
- Typography: `font-display` for headers (Termina, uppercase), `font-sans` for body (Aeonik Pro)
- No font-bold/font-semibold -- max font-medium
- Monetary values: wrapped in `BlurredAmount`
- Buttons: `tokens.button.inline` for in-panel actions, `tokens.button.card` for footer CTAs
- Tab headers: `font-sans`, Title Case
- Glass aesthetic: `bg-card/80 backdrop-blur-xl border-border`

