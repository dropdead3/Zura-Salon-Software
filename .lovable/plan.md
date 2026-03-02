

## Fix "View As" Toggle — Add Role Selection Popover

The "View As" button in the top bar currently does nothing when clicked in the non-active state. The `onClick` handler only handles the "exit" case (`clearViewAs`), but there's no UI to actually select a role to impersonate. The `setViewAsRole` function is destructured in `DashboardLayout` but never passed into the toggle's click path.

### Root Cause

In `DashboardLayout.tsx` lines 405–432, the `ViewAsToggle` component wraps a `Button` whose `onClick` only fires `clearViewAs()` when already viewing as someone. When not in View As mode, the click is a no-op.

### Solution

Convert the `ViewAsToggle` from a plain `Button` into a `Popover`-based component:

1. **When not in View As mode**: Clicking opens a popover listing all active roles (from `useRoles`), grouped by category. Selecting a role calls `setViewAsRole(role.name)`.

2. **When in View As mode**: Clicking the button directly calls `clearViewAs()` (exits impersonation) — no popover needed.

### Single File Change

**`src/components/dashboard/DashboardLayout.tsx`** — Rewrite the `ViewAsToggle` inner component (~lines 405–432):

- Import `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
- Add local state `viewAsOpen` to control popover
- When not viewing as: render Popover with role list (fetched via existing `useRoles` or from ViewAsContext's roles)
- Each role row: icon (from `getRoleIconComponent`), display name, click → `setViewAsRole(role.name as AppRole)` + close popover
- When viewing as: keep current behavior (direct `clearViewAs()` on click, no popover)
- Style the popover to match the existing overflow menu aesthetic (glass card, `bg-card/80 backdrop-blur-xl`, grouped by category)

### Roles Data

The `useRoles` hook is already available in `ViewAsContext` and returns `Role[]` with `name`, `display_name`, `icon`, `color`, `category`, `sort_order`, `is_active`. We can import `useRoles` directly in `DashboardLayout` (it's already imported indirectly) or pass the roles through. Since `DashboardLayout` already has access to `setViewAsRole` from `useViewAs()`, we just need to add the role list query and popover UI.

