

## Fix Scheduler Action Bar Visibility

### Problem
The `ScheduleActionBar` is positioned `absolute bottom-0` inside a `div.h-screen` container. However, `h-screen` (100vh) doesn't account for the `DashboardLayout` chrome (top bar, sidebar padding), so the bottom of the container extends below the visible viewport, hiding the action bar.

### Solution
Change the outer container from `h-screen` to `h-full` so it fills only the available space within the `DashboardLayout` content area, rather than the full viewport height. This ensures `absolute bottom-0` anchors to the actual visible bottom.

### Changes

**File: `src/pages/dashboard/Schedule.tsx` (line 869)**

Replace:
```tsx
<div className="flex flex-col h-screen relative">
```
With:
```tsx
<div className="flex flex-col h-full relative">
```

If `h-full` doesn't resolve it (parent may not have explicit height), fall back to `h-[calc(100vh-var(--header-height,0px))]` or use `100dvh` minus the layout chrome. Will verify the `DashboardLayout` content wrapper provides a bounded height for `h-full` to inherit.

### Files Modified
- `src/pages/dashboard/Schedule.tsx` — one class change on the root container

