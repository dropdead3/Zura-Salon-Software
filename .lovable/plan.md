

# Wire Service Category Colors to All Appointment Statuses

## Problem

Appointment cards on the schedule are only colored by service category when their status is exactly `'booked'`. For all other statuses (`confirmed`, `checked_in`, `completed`, etc.), the cards fall back to status-based colors from the design tokens, ignoring the admin-configured service category colors entirely.

The `color_by` preference already exists in `calendar_preferences` (with values `'status'`, `'service'`, `'stylist'`) but is never consumed by any calendar view component. It's stored in the database but completely unused.

## Solution

Wire the `color_by` calendar preference through to DayView and WeekView so that when set to `'service'` (or as the default behavior the user expects), appointments are always colored by their service category -- regardless of status. A subtle status indicator (the left border or a small pip) will still communicate appointment status without overriding the category color.

## Changes

### 1. Pass `colorBy` preference from Schedule page to views

**File:** `src/pages/dashboard/Schedule.tsx`

- Read `colorBy` from the existing `useCalendarPreferences` hook (already used for other prefs like `hoursStart`, `hoursEnd`)
- Pass it as a prop to `DayView` and `WeekView`

### 2. Update DayView to respect `colorBy` preference

**File:** `src/components/dashboard/schedule/DayView.tsx`

- Add `colorBy?: 'status' | 'service' | 'stylist'` to `DayViewProps`
- Pass it through to `AppointmentCard`
- Change the `useCategoryColor` logic from:
  ```
  const useCategoryColor = appointment.status === 'booked';
  ```
  to:
  ```
  const useCategoryColor = colorBy === 'service' || appointment.status === 'booked';
  ```
- When `colorBy === 'service'`, use the `statusColors.border` class on the left border to preserve a status signal while the card body uses category color

### 3. Update WeekView to respect `colorBy` preference

**File:** `src/components/dashboard/schedule/WeekView.tsx`

- Add `colorBy?: 'status' | 'service' | 'stylist'` to `WeekViewProps` and `WeekAppointmentCard`
- Apply the same `useCategoryColor` logic change as DayView
- Preserve the left-border status indicator

### 4. Set default `color_by` to `'service'`

**File:** `src/hooks/useCalendarPreferences.ts`

- Change the default from `'status'` to `'service'` so new users and users who haven't explicitly chosen get category colors by default

### 5. Update AgendaView status badge to show category color swatch

**File:** `src/components/dashboard/schedule/AgendaView.tsx`

- Add a small category color swatch (circle) next to each appointment row so category identity is visible even in list mode

## Status Signal Preservation

When `colorBy === 'service'`, the appointment card body uses the service category color, but the status is still communicated through:
- **Left border color**: Maps to appointment status (green for confirmed, blue for checked-in, etc.)
- **Status pip**: The small dot indicator already added in the previous enhancement
- **Cancelled/No-show treatments**: Opacity reduction and ring indicators remain unchanged

## File Summary

| Action | File |
|--------|------|
| Modify | `src/pages/dashboard/Schedule.tsx` -- pass `colorBy` pref to views |
| Modify | `src/components/dashboard/schedule/DayView.tsx` -- accept and use `colorBy` prop |
| Modify | `src/components/dashboard/schedule/WeekView.tsx` -- accept and use `colorBy` prop |
| Modify | `src/components/dashboard/schedule/AgendaView.tsx` -- add category color swatch |
| Modify | `src/hooks/useCalendarPreferences.ts` -- change default `color_by` to `'service'` |

No new files, no database changes, no new dependencies.
