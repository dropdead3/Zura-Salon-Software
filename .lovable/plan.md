
# Fix Red Dot Position on "Today" Button

## Problem

The "Today" button in the schedule header renders the red closure dot **below** the date label (as a third stacked element), while the other day buttons correctly render the dot **to the left** of the day name using a horizontal flex row.

## Root Cause

In `ScheduleHeader.tsx`, the "Today" button (line 337-341) stacks elements vertically:
```
Today        (text)
Feb 22       (text)
 *           (red dot -- BELOW, wrong)
```

The other day buttons (lines 378-386) use a nested `flex items-center gap-1` row:
```
 * Mon       (dot + label in a row -- CORRECT)
  23         (date below)
```

## Fix

Restructure the "Today" button to match the same pattern as the other day buttons -- wrap "Today" and the red dot in a horizontal flex row.

### File: `src/components/dashboard/schedule/ScheduleHeader.tsx`

**Before (lines 337-341):**
```tsx
<span className="font-medium text-xs tracking-wide">Today</span>
<span className="text-[10px] opacity-70">{format(new Date(), 'MMM d')}</span>
{todayClosed.isClosed && (
  <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-0.5" />
)}
```

**After:**
```tsx
<div className="flex items-center gap-1">
  {todayClosed.isClosed && (
    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
  )}
  <span className="font-medium text-xs tracking-wide">Today</span>
</div>
<span className="text-[10px] opacity-70">{format(new Date(), 'MMM d')}</span>
```

This places the red dot to the left of "Today", matching the pattern used by Mon/Tue/Wed buttons.

## Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/ScheduleHeader.tsx` -- move red dot beside label |

Single structural change. No new dependencies.
