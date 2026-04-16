

# Enable Admins to Book Appointments & Breaks for Staff

## Problem

When an admin (without `stylist`/`booth_renter` role) clicks an empty slot or "New Booking", they're forced into the **Internal Meeting** wizard only. They cannot:
- Add a client appointment (lead) onto a stylist's calendar
- Add a break/timeblock to a stylist's day

The infrastructure already exists — `BookingWizard` accepts `defaultStylistId` and has a `StylistStep`, and `AddTimeBlockForm` already has an admin staff picker. Only the **routing logic** is gating admins out.

## Fix

In `src/pages/dashboard/Schedule.tsx`, treat admin-only users the same as dual-role users by showing the `ScheduleTypeSelector` (Client Appointment / Internal Meeting / Timeblock). The selector already handles all three branches.

### Changes

**`src/pages/dashboard/Schedule.tsx` — two functions:**

1. **`handleSlotClick`** (lines 568-575): Replace the three-way branch with:
   ```ts
   if (isAdminRole) {
     setTypeSelectorOpen(true);
   } else {
     setBookingOpen(true);
   }
   ```

2. **`handleNewBooking`** (lines 593-606): Same simplification — any admin (with or without service-provider role) gets the type selector; pure stylists go straight to client booking.

That's it. The `bookingDefaults` (date, time, stylistId) set immediately before are already passed into:
- `NewBookingSheet` (via `defaultStylistId`/`defaultDate`/`defaultTime`)
- `MeetingSchedulerWizard` (via `defaultDate`)
- `AddTimeBlockForm` (via `breakDefaults.stylistId`/`time`)

So a slot click on a stylist's column will pre-fill that stylist in whichever flow the admin chooses.

### Optional polish (recommended)

Update the Client Appointment description in `ScheduleTypeSelector.tsx` from "Book a service for a client" to **"Book a service or lead for a client"** to make the lead-management use case explicit for admins.

## Why this is safe

- No schema, RLS, or hook changes
- `BookingWizard` already supports stylist-less starts (admins can pick a stylist mid-flow if they entered via the toolbar)
- `AddTimeBlockForm` already gates the staff picker behind `isAdmin`
- Pure stylist UX is unchanged (they still skip the selector)

## Files touched

- `src/pages/dashboard/Schedule.tsx` (logic in 2 handlers)
- `src/components/dashboard/schedule/meetings/ScheduleTypeSelector.tsx` (1 copy tweak, optional)

