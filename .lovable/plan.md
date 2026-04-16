

# Fix: Enlarge NC/RC Badge on Appointment Cards

## Problem
The NC (New Client) / RC (Returning Client) badge in the bottom-right corner of appointment cards is `h-4 w-4` (16px) with `text-[7px]` — barely visible.

## Change
**File**: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

Increase the badge size in both the Weekly view (line ~241) and Day view (line ~271) instances:

- Circle: `h-4 w-4` → `h-5 w-5` (20px)
- Font: `text-[7px]` → `text-[9px]`
- Position: keep `bottom-1 right-1`

Both NC and RC badges get the same size increase. No other files change.

