

# Appointment Detail Panel -- Gap Fixes and Enhancements

## Overview

Six targeted improvements to the existing Luxury Bento Appointment Detail Panel, addressing the gaps identified during review.

## Changes

### 1. Cancellation / No-Show Reason Input

Add a `Textarea` to the confirmation dialog (`AlertDialog`) for capturing a reason when cancelling or marking no-show. The reason will be auto-appended to appointment notes via `useAppointmentNotes.addNote` before the status change fires.

**File:** `AppointmentDetailSheet.tsx`
- Add `cancelReason` state variable
- Expand the `AlertDialog` to include a Textarea between description and footer
- In `confirmStatusChange`, call `addNote` with a prefixed reason (e.g., `[Cancelled] Client rescheduling next week`) before executing the status transition
- Same pattern for the `handleCancelAllFuture` recurring cancellation -- add a reason input in that flow too
- Clear reason state when dialog closes

### 2. Location Display in Appointment Info

Add a `MapPin` row to the Appointment Info card showing the location name. The `PhorestAppointment` type already has `location_id`. We will look up the location name from `organization_locations` using a lightweight query.

**File:** `AppointmentDetailSheet.tsx`
- Add a `useQuery` for location name from `organization_locations` keyed on `appointment.location_id`
- Render a `MapPin` row below the date/time rows: `<MapPin /> Location Name`

### 3. Escape Key Handler

Add a `useEffect` that listens for the `Escape` keydown event and calls `handleClose` when the panel is open.

**File:** `AppointmentDetailSheet.tsx`
- Add `useEffect` with `keydown` listener for `key === 'Escape'`, gated on `open`
- Clean up listener on unmount

### 4. "Open Client Profile" Button

Add a button in the header area (below the client name) that opens the `ClientDetailSheet`. Since `ClientDetailSheet` is rendered separately in the page, this will close the appointment panel and emit a callback to open the client panel.

**File:** `AppointmentDetailSheet.tsx`
- Add `onOpenClientProfile?: (clientId: string) => void` prop
- Render a small ghost button with `User` icon + "View Profile" text below the service summary line, only when the prop and `phorest_client_id` are both present

**File:** `Schedule.tsx`
- Wire the new prop to set the selected client and open `ClientDetailSheet`

### 5. Staggered Entry Animations for Bento Cards

Wrap the content sections within each tab in `motion.div` containers with staggered children animation, matching the premium bento pattern.

**File:** `AppointmentDetailSheet.tsx`
- Add a `staggerContainer` and `staggerItem` variant object
- Wrap each tab's `TabsContent` children in `motion.div variants={staggerContainer}` with individual items as `motion.div variants={staggerItem}`
- Animation: parent `staggerChildren: 0.04`, children fade+translateY from 8px

### 6. Service Frequency in History Tab

Add a "Top Services" mini-section to the History tab showing the most frequently booked services derived from `visitHistory`.

**File:** `AppointmentDetailSheet.tsx`
- Add a `useMemo` that computes service frequency counts from `visitHistory` (parsing `service_name` the same way as the details tab)
- Render up to 3 top services as small badges with count indicators below the KPI tiles, before the visit timeline

## Files Modified

| File | Changes |
|---|---|
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add cancel reason input, location query + display, Escape key handler, client profile button, stagger animations, service frequency |
| `src/pages/dashboard/Schedule.tsx` | Wire `onOpenClientProfile` prop |

## Technical Notes

- Cancel reason is stored as an appointment note (not a new DB column) -- no migration needed
- Location lookup uses existing `organization_locations` table
- Stagger animations use framer-motion variants (already imported)
- All changes are additive; no breaking interface changes

