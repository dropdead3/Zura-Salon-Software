

# Reschedule History on Appointment Cards

## Overview

When an appointment is moved or rescheduled, there is currently no record of the original time/date. This plan adds reschedule tracking at the database level and surfaces it visually on appointment cards so staff can instantly see that an appointment was moved and where it came from.

## What Changes

### 1. Database: Add reschedule tracking columns

Add three new columns to `phorest_appointments`:

| Column | Type | Purpose |
|--------|------|---------|
| `rescheduled_from_date` | date | Original date before the most recent move |
| `rescheduled_from_time` | time | Original start time before the most recent move |
| `rescheduled_at` | timestamptz | When the reschedule happened |

These are nullable and only populated when an appointment is actually moved.

### 2. Edge Function: Record previous time before updating

In `update-phorest-appointment-time/index.ts`, before writing the new date/time, save the current values into the new columns:

```text
updatePayload.rescheduled_from_date = localApt.appointment_date
updatePayload.rescheduled_from_time = localApt.start_time
updatePayload.rescheduled_at = new Date().toISOString()
```

This captures the "moved from" snapshot on every reschedule.

### 3. UI: Visual indicator on appointment cards

**DayView and WeekView cards** -- When `rescheduled_at` is present:
- Show a small `ArrowRightLeft` icon (from lucide) next to the client name, indicating the appointment was moved
- On non-compact cards (duration >= 45min), show a subtle line: "Moved from 9:00 AM" in muted text

**Tooltip** -- Add a "Rescheduled" section showing:
- "Moved from [original date if different] [original time]"
- Relative timestamp: "2 hours ago" or "Yesterday"

**AppointmentDetailSheet** -- In the Details tab, add a "Reschedule History" row showing the original date/time and when it was moved.

### 4. Files Modified

| File | Change |
|------|--------|
| Database migration | Add `rescheduled_from_date`, `rescheduled_from_time`, `rescheduled_at` columns |
| `supabase/functions/update-phorest-appointment-time/index.ts` | Save previous date/time into new columns before updating |
| `src/components/dashboard/schedule/DayView.tsx` | Add rescheduled icon and "Moved from" line on cards and tooltip |
| `src/components/dashboard/schedule/WeekView.tsx` | Same rescheduled indicator on week view cards |
| `src/components/dashboard/schedule/AgendaView.tsx` | Same rescheduled indicator on agenda cards |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add reschedule history row in Details tab |

### 5. Visual Design

- Icon: `ArrowRightLeft` from lucide-react, sized `h-3 w-3`, styled with `text-blue-500 dark:text-blue-400`
- "Moved from" text: `text-[10px] opacity-70 italic` to keep it subtle and non-intrusive
- Tooltip section: Standard muted foreground, with a `Clock` icon prefix
- No bold weights used (per UI Canon)

