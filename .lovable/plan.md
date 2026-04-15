

## Auto-Collapse Sidebar on Schedule Page

### Problem
The schedule view needs maximum horizontal space for the day/week grid. Currently the sidebar retains whatever state the user last set, often expanded, which wastes space on this particular route.

### Solution
Add a `useEffect` in `DashboardLayout.tsx` that auto-collapses the sidebar when the user navigates to the schedule route, and restores the previous state when they leave.

### Changes

**File: `src/components/dashboard/DashboardLayout.tsx`**

1. Track the previous collapse state with a ref (`prevCollapseRef`)
2. Add a `useEffect` watching `location.pathname`:
   - When pathname includes `/schedule` → store current collapse state in ref, then set `sidebarCollapsed = true`
   - When navigating away from `/schedule` → restore the ref value
3. The user can still manually expand the sidebar while on schedule — the auto-collapse only fires on route entry

This keeps localStorage as the user's general preference but treats the schedule page as a special case that defaults to collapsed for maximum grid visibility.

### Files Modified
- `src/components/dashboard/DashboardLayout.tsx` — add schedule-aware auto-collapse effect (~10 lines)

