

## Batch Bar Button Sizing and Layout Fix

### Problem
From the screenshot, the batch bar buttons are too large and the "Update Status" select trigger is too narrow (150px), causing "Update Status" text to wrap to two lines.

### Changes

**File: `src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx`**

1. **Widen the Update Status select trigger**: Change `w-[150px]` to `w-[180px]` so "Update Status" text stays on one line
2. **Reduce button heights**: Add `h-7 text-xs` to the Share and Export CSV buttons to make them more compact
3. **Reduce bar padding**: Change `py-3` to `py-2` on the sticky bar container for a tighter look
4. **Shrink icons**: Reduce button icons from `h-3.5 w-3.5` to `h-3 w-3` for proportion

### Summary of class changes

| Element | Current | New |
|---------|---------|-----|
| Bar container | `py-3` | `py-2` |
| SelectTrigger | `w-[150px] h-8 text-xs` | `w-[180px] h-7 text-xs` |
| Share / Export buttons | default `h-9` via size="sm" | Add `h-7 text-xs` override |
| Button icons | `h-3.5 w-3.5` | `h-3 w-3` |
| SelectTrigger icon | `h-3.5 w-3.5` | `h-3 w-3` |

