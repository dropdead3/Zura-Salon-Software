

# Replace "No Check-In" + "Booked" with Confirmed / Unconfirmed / Walk-In Statuses

## Problem
All appointments from Phorest come in as `booked` status. The "No Check-In" indicator badge fires for any `booked` appointment past its start time, making every current appointment show a red "No Check-In" badge. The user wants meaningful confirmation statuses instead.

## New Status Model

| Status | When Applied | Badge Color |
|--------|-------------|-------------|
| **Unconfirmed** | Default for Phorest-synced appointments (was `booked`) | Amber/warning |
| **Confirmed** | Explicitly confirmed (client responded, staff confirmed) | Green |
| **Walk-In** | Created via Kiosk walk-in flow or front desk same-day creation | Teal/cyan |
| **Checked In** | Client checked in at kiosk or marked by staff | Blue (existing) |
| **Completed** | Service finished | Purple (existing) |
| **Cancelled** | Cancelled | Red (existing) |
| **No Show** | No show | Red (existing) |

## Implementation

### 1. Add `walk_in` to status types and color maps
**File:** `src/lib/design-tokens.ts`

- Add `'walk_in'` and `'unconfirmed'` to `AppointmentStatusKey` type
- Add color entries for both new statuses across all three maps (`APPOINTMENT_STATUS_COLORS`, `APPOINTMENT_STATUS_BADGE`, `APPOINTMENT_STATUS_CONFIG`)
- `unconfirmed`: amber tones (replaces what `booked` previously looked like — neutral slate)
- `walk_in`: teal/cyan tones to distinguish from confirmed

### 2. Remap `booked` → `unconfirmed` in display layer
**File:** `src/hooks/usePhorestCalendar.ts`

In the existing post-processing step, remap `booked` status to `unconfirmed` for display. This keeps the database value stable while changing what users see.

### 3. Mark kiosk/walk-in appointments as `walk_in` status
**File:** `src/hooks/useKioskCheckin.ts`

When a walk-in booking is created via kiosk, set the appointment status to `walk_in` instead of `booked`.

### 4. Remove "No Check-In" indicator entirely
**Files:**
- `src/components/dashboard/schedule/appointment-card-indicators.tsx` — remove the `isOverdue` indicator block
- `src/components/dashboard/schedule/DayView.tsx` — remove `isOverdueForCheckin` computation
- `src/components/dashboard/schedule/WeekView.tsx` — remove `isOverdueForCheckin` prop/computation
- `src/components/dashboard/schedule/AgendaView.tsx` — remove overdue prop
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — remove `isOverdueForCheckin` prop and the red ring styling
- `src/components/dashboard/schedule/ScheduleLegend.tsx` — remove "No Check-In" legend entry

### 5. Update legend and filters
**File:** `src/components/dashboard/schedule/ScheduleLegend.tsx` — add Unconfirmed, Walk-In entries
**File:** `src/components/dashboard/schedule/CalendarFiltersPopover.tsx` — confirmation filter already exists, will work naturally

### 6. Keep `booked` in the type union
`booked` stays in the type as a fallback for any edge cases, but its display label becomes "Booked" (legacy) and it maps visually to the same as unconfirmed.

## Files to Modify
- `src/lib/design-tokens.ts` — add `unconfirmed` and `walk_in` status keys + colors
- `src/hooks/usePhorestCalendar.ts` — remap `booked` → `unconfirmed` in post-processing
- `src/hooks/useKioskCheckin.ts` — set walk-in status
- `src/components/dashboard/schedule/appointment-card-indicators.tsx` — remove overdue indicator
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — remove overdue ring styling + prop
- `src/components/dashboard/schedule/DayView.tsx` — remove overdue computation
- `src/components/dashboard/schedule/WeekView.tsx` — remove overdue prop
- `src/components/dashboard/schedule/AgendaView.tsx` — remove overdue prop
- `src/components/dashboard/schedule/ScheduleLegend.tsx` — update legend entries

## Verification
- All Phorest-synced appointments show "Unconfirmed" (amber) instead of "Booked"
- No "No Check-In" badge appears anywhere
- Walk-in appointments from kiosk show "Walk-In" (teal)
- Confirmed appointments show green badge
- Existing checked_in/completed/cancelled/no_show statuses unchanged

