

# Enhance and Refine Appointment Card UI

## Current State

The appointment cards across DayView, WeekView, and AgendaView are functional but have several UI inconsistencies and missing polish:

1. **Missing `pending` status from design tokens** -- The `APPOINTMENT_STATUS_COLORS`, `APPOINTMENT_STATUS_BADGE`, and `APPOINTMENT_STATUS_CONFIG` maps only cover 6 statuses (booked, confirmed, checked_in, completed, cancelled, no_show). The `pending` status exists in the type but has no color tokens, causing newly created appointments or pending redos to fall through to undefined styling.

2. **No status indicator on "booked" appointments** -- When `status === 'booked'`, the card uses category-based coloring instead of status coloring (`useCategoryColor = true`). This is good for visual variety, but there's no status badge or indicator visible on the card itself, so a booked appointment looks identical regardless of whether it's pending confirmation.

3. **Confirmed status dot is subtle** -- The `confirmed` status only shows a tiny 1.5px white dot that's nearly invisible against light category colors.

4. **WeekView has static Heart/Smartphone icons** -- Bottom-right icons (Heart, Smartphone) appear on every non-compact appointment regardless of context. These are decorative placeholders with no meaning.

5. **DayView card radius is `rounded-sm`** -- Doesn't match the bento card system's `rounded-xl` standard for containers. Calendar appointment cards should use `rounded-md` for better visual consistency.

6. **No hover elevation on DayView cards** -- WeekView has `hover:shadow-lg hover:z-20` but DayView cards lack hover feedback.

## Changes

### 1. Add `pending` status to all three design token maps

**File:** `src/lib/design-tokens.ts`

Add `pending` to `AppointmentStatusKey` type and all three maps:
- `APPOINTMENT_STATUS_COLORS`: amber/warm styling (bg-amber-100, border-amber-400, text-amber-900)
- `APPOINTMENT_STATUS_BADGE`: pastel amber variant
- `APPOINTMENT_STATUS_CONFIG`: full config with amber borders/labels

### 2. Improve DayView AppointmentCard polish

**File:** `src/components/dashboard/schedule/DayView.tsx`

- Change `rounded-sm` to `rounded-md` on the card container
- Add `hover:shadow-md hover:z-20 transition-shadow` for hover elevation
- Replace the tiny confirmed dot (w-1.5 h-1.5) with a small status-colored pip that's more visible
- Add a subtle status badge for non-compact cards when the appointment has a meaningful status (confirmed, checked_in) -- a small uppercase label anchored at the bottom-right

### 3. Clean up WeekView AppointmentCard

**File:** `src/components/dashboard/schedule/WeekView.tsx`

- Remove the static Heart/Smartphone placeholder icons (lines 226-231) -- they have no data backing and add noise
- Change `rounded-sm` to `rounded-md`
- Add a small status pip indicator for confirmed/checked_in appointments in non-compact mode

### 4. Refine AgendaView AppointmentCard

**File:** `src/components/dashboard/schedule/AgendaView.tsx`

- Add dark mode support to `APPOINTMENT_STATUS_BADGE` references (the badge map lacks dark mode classes -- already addressed in token update)
- Add a subtle duration display (e.g., "45 min") next to the time range for quicker scanning

### 5. Update PhorestAppointment type compatibility

**File:** `src/hooks/usePhorestCalendar.ts` (read-only check)

Verify `AppointmentStatus` type includes `pending`. If not, add it to the union type.

## File Summary

| Action | File |
|--------|------|
| Modify | `src/lib/design-tokens.ts` -- add `pending` to status type and all 3 color maps |
| Modify | `src/components/dashboard/schedule/DayView.tsx` -- rounded-md, hover states, status pip |
| Modify | `src/components/dashboard/schedule/WeekView.tsx` -- rounded-md, remove placeholder icons, status pip |
| Modify | `src/components/dashboard/schedule/AgendaView.tsx` -- add duration display |

No new files or dependencies required.
