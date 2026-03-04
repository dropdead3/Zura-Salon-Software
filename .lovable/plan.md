

## Problem: No Visible Entry Point for Admin Meetings on Schedule

The `handleNewBooking` function correctly routes admin-only users to the meeting wizard, but **it's never exposed as a clickable button**. It's passed to `ScheduleHeader` as `onNewBooking` but no button in the header actually calls it. The only booking trigger is clicking on the time grid (via `onSlotClick`), which requires staff columns — something admin-only users without a service provider role may not interact with naturally.

### Fix

Add a prominent "Schedule Meeting" button to the `ScheduleHeader` for admin users, and a general "+ New" button for all users with create permission.

#### Changes to `src/components/dashboard/schedule/ScheduleHeader.tsx`

1. Add a CTA button in the top-right action area (near Settings icon) that calls `onNewBooking`
2. Button label adapts by role:
   - Admin-only users: "New Meeting" with `Users` icon
   - Dual-role (admin + service provider): "New" with `Plus` icon (opens the type selector)
   - Service providers only: "New Booking" with `CalendarPlus` icon
3. Only shown when `canCreate` is true
4. Uses `tokens.button.cardAction` (pill style) to match the header aesthetic

#### Changes to `src/pages/dashboard/Schedule.tsx`

Pass `isAdminRole` and `isServiceProvider` flags to `ScheduleHeader` so it can render the correct button label.

```text
ScheduleHeader (top-right actions area):
┌──────────────────────────────────────────────────┐
│ [Day|Week] [Shifts]  Date  Staff  ...  [+ New Meeting]  ⚙ │
└──────────────────────────────────────────────────┘
```

Two files modified: `ScheduleHeader.tsx` and `Schedule.tsx`.

