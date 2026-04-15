

## Remove "New Meeting" Button from Scheduler

### Change
Delete the entire "New Booking / Meeting" button block (lines 315-339) in `src/components/dashboard/schedule/ScheduleHeader.tsx`. This removes the conditional button that shows "New Meeting", "New", or "New Booking" depending on the user's role.

### Scope
- **1 file**: `src/components/dashboard/schedule/ScheduleHeader.tsx` (~25 lines removed)
- No other files affected

