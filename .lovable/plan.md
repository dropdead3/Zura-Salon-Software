

# Fix Time Range Line Wrapping on Appointment Cards

## Problem
Line 326 in `AppointmentCardContent.tsx` renders the time range (`10:00 AM - 12:00 PM`) without `whitespace-nowrap` or `truncate`. On narrow cards, longer time strings wrap to a second line — visible on Angela Rapazzini's card where "12:00" and "PM" break apart. Shorter time ranges (e.g., `10:00 AM - 11:30 AM`) happen to fit, masking the issue.

## Fix
Add `whitespace-nowrap` to the time `<span>` on line 326 so the time range never breaks mid-string. The parent `<div>` already has `flex items-center justify-between`, so adding `truncate` on the time span and `shrink-0` on the price span will keep layout stable if the card is extremely narrow.

### Change in `AppointmentCardContent.tsx`

Line 326 — wrap the time span:
```tsx
// Before
<span>{formatTime12h(appointment.start_time)} - {formatTime12h(appointment.end_time)}</span>

// After
<span className="whitespace-nowrap truncate">{formatTime12h(appointment.start_time)} - {formatTime12h(appointment.end_time)}</span>
```

### Files Modified
1. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — add `whitespace-nowrap truncate` to time range span

