

## Recurring Shifts + Shift Scheduler Enhancements

### Current State
The shift scheduler has `is_recurring` and `recurrence_pattern` columns in the database but they're never used in the UI. The editor creates single-date shifts only. The view is a basic weekly grid with no copy, template, or bulk operations.

### Plan

#### 1. Recurring Shifts in ShiftEditorDialog
Add a "Repeat" selector below the date picker with options: None, Daily, Weekly, Bi-Weekly, Custom (select days of week). When recurring is selected:
- Show an "Until" date picker (end date for the recurrence)
- On submit, generate all individual shift rows for the date range (server-side is ideal but we'll do client-side batch insert for now since the table already supports `is_recurring` and `recurrence_pattern`)
- Mark each generated shift with `is_recurring: true` and `recurrence_pattern` (e.g., `weekly`, `biweekly`, `daily`, or `custom:mon,wed,fri`)
- Show a recurring icon on shift cards in the grid

**Hook change (`useStaffShifts.ts`)**: Add a `useCreateRecurringShifts` mutation that accepts a base shift + recurrence config and batch-inserts all dates.

**Dialog change (`ShiftEditorDialog.tsx`)**: Add recurrence UI section with pattern selector + end date.

#### 2. Suggested Enhancements (build all)

**a. Copy Previous Week**
Button in `ShiftScheduleView` header: "Copy Last Week". Duplicates all shifts from the previous week into the current week (skipping duplicates). Quick way to replicate repeating schedules without setting up recurrence.

**b. Shift Duration Display**
Show total scheduled hours per staff member per week in the left name column (e.g., "Sarah — 32h"). Helps admins monitor labor allocation at a glance.

**c. Shift Conflict Detection**
When creating/editing a shift, warn if the staff member already has an overlapping shift on that date. Client-side check against existing shifts data.

**d. Recurring Shift Indicator**
Show a small `RefreshCw` icon on shift cards that are part of a recurring pattern. Consistent with how tasks display recurrence.

**e. Delete Confirmation + "Delete All Future" for Recurring**
When deleting a recurring shift, offer: "This shift only" vs "This and all future shifts in this series". Uses `recurrence_pattern` match + `shift_date >= selected` to bulk cancel.

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useStaffShifts.ts` | Add `useCreateRecurringShifts` mutation, add `useCopyPreviousWeek` mutation |
| `src/components/dashboard/schedule/shifts/ShiftEditorDialog.tsx` | Add recurrence pattern selector, end date picker, conflict warning |
| `src/components/dashboard/schedule/shifts/ShiftScheduleView.tsx` | Add "Copy Last Week" button, weekly hours per staff, recurring icon on cards, delete confirmation dialog with series option |

### Technical Detail

**Batch insert for recurring shifts** — generate dates client-side using `date-fns` iteration:
```text
For "weekly" from March 4 to April 30:
  → Generate: Mar 4, Mar 11, Mar 18, ... Apr 30
  → Insert all as individual rows with is_recurring=true, recurrence_pattern='weekly'
```

**Copy Previous Week** — query shifts for `weekStart - 7` to `weekStart - 1`, then insert copies with dates shifted +7 days.

**Conflict detection** — filter existing shifts by `user_id` + `shift_date`, check time overlap `(newStart < existingEnd && newEnd > existingStart)`.

