

# Wire Quick Actions + Control Tower Timestamp

## Changes

### 1. Quick Actions → Specific Sub-Tabs

Currently all quick actions call `onNavigate('inventory')` or similar, which navigates to the section but not a specific tab within it. The `BackroomInventorySection` has its own internal `activeTab` state with no way to set it from outside.

**Approach**: Extend `onNavigate` to support a `section:tab` format (e.g., `inventory:counts`, `inventory:orders`).

- **`BackroomSettings.tsx`**: Parse the navigation string — if it contains `:`, split into section + sub-tab. Pass the sub-tab as a prop to the relevant section component.
- **`BackroomInventorySection.tsx`**: Accept an optional `initialTab` prop. When it changes, set the internal `activeTab` state.
- **`BackroomDashboardOverview.tsx`**: Update quick action buttons:
  - "Start Count" → `onNavigate('inventory:counts')`
  - "Create PO" → `onNavigate('inventory:orders')`
  - "View Exceptions" → `onNavigate('alerts')` (unchanged)
  - "Export Report" → `onNavigate('insights')` (unchanged)

### 2. Control Tower "Last Updated" Timestamp

Add a subtle timestamp below the Control Tower card header showing when data was last fetched.

- **`useBackroomDashboard.ts`**: Track a `lastUpdatedAt` timestamp. Set it to `new Date()` whenever loading transitions from `true` to `false` (i.e., data just finished fetching).
- **`BackroomDashboardOverview.tsx`**: Display it as relative time (e.g., "Updated 2 min ago") in the Control Tower card header area using `formatRelativeTime` from `@/lib/format`.

## Files

| File | Change |
|------|--------|
| `BackroomSettings.tsx` | Parse `section:tab` in handleNavigate, pass `initialTab` to `BackroomInventorySection` |
| `BackroomInventorySection.tsx` | Accept + react to `initialTab` prop |
| `BackroomDashboardOverview.tsx` | Update quick action targets, add last-updated timestamp to Control Tower |
| `useBackroomDashboard.ts` | Track `lastUpdatedAt` |

