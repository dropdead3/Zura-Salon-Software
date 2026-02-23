
# Narrow the Bottom Action Bar to Clear the FAB

## Problem
The bottom action bar extends full-width (`left-0 right-0`), causing it to render behind the AI Copilot FAB button on the right side.

## Fix

**File: `src/pages/dashboard/Schedule.tsx` (line 700)**

Add right padding to the bar's container so it stops short of the FAB. The FAB is 56px wide (`h-14 w-14`) plus 16px from the right edge (`right-4`), so ~80px of clearance is needed.

Change:
```
<div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none z-20">
```
To:
```
<div className="absolute bottom-0 left-0 right-0 pl-4 pr-20 pb-4 pointer-events-none z-20">
```

This replaces the symmetric `px-4` with `pl-4` (left) and `pr-20` (right, 80px) to leave space for the floating AI Copilot button.

| File | Change |
|---|---|
| `src/pages/dashboard/Schedule.tsx` | Adjust right padding on action bar container to clear the FAB |
