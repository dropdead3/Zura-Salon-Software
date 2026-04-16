

# Align Action Bar Bottom with FAB

## Problem
The bottom action bar on the schedule page sits ~44px from the window bottom (32px from `lg:pb-8` on the main wrapper + 12px from the bar's own `pb-3`). The floating action button is positioned at `bottom-4` (16px). These need to match.

## Changes

### 1. `src/components/dashboard/DashboardLayout.tsx` (line 557)
Reduce bottom padding when `hideFooter` is true — there's no footer to clear, so the large `pb-8` is unnecessary.

**Current:**
```
"flex-1 p-4 lg:px-8 lg:pb-8 lg:pt-4"
```

**New:**
```
`flex-1 p-4 lg:px-8 lg:pt-4 ${hideFooter ? 'lg:pb-4' : 'lg:pb-8'}`
```

### 2. `src/pages/dashboard/Schedule.tsx` (line 960)
Remove the action bar's extra bottom padding since the parent now provides the correct spacing.

**Current:**
```
<div className="shrink-0 px-4 pr-20 pb-3 pt-1">
```

**New:**
```
<div className="shrink-0 px-4 pr-20 pb-0 pt-1">
```

This gives 16px total from window bottom to action bar, matching the FAB's `bottom-4` position. Two lines, two files.

