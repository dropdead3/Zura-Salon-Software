

## Problem

God Mode is currently restricted in several ways that prevent platform operators from making changes on behalf of an organization:

1. **`useTasks` blocks all mutations** — Every create/update/delete/toggle/snooze operation throws `"Cannot modify tasks while impersonating"` when `isImpersonating` is true
2. **`isLeadership` doesn't account for God Mode** — The dashboard's leadership check (`isLeadership`) in `DashboardHome.tsx` doesn't include platform users during impersonation, so God Mode users can't see leadership-only UI (analytics toggles, AI insights, customize menu sections)
3. **`DashboardCustomizeMenu` gates sections behind `roleContext.isLeadership`** — Available Analytics and Quick Access Hubs sections are hidden from God Mode users who aren't detected as leadership
4. **RLS policies may still block writes** — Some tables may not include `is_platform_user(auth.uid())` in their write policies, causing silent failures on mutations

## Solution

Make God Mode a full-access mode: platform users impersonating an org get unrestricted read/write access across all dashboard surfaces.

### Changes

**1. `src/hooks/useTasks.ts` — Remove impersonation write blocks**
- Remove all `if (isImpersonating) throw` guards from `createTask`, `toggleTask`, `deleteTask`, `snoozeTask`, and `updateTask` mutations
- Remove the corresponding `onError` handlers that check for impersonation error messages
- God Mode users should be able to create/edit/delete tasks on behalf of the org

**2. `src/pages/dashboard/DashboardHome.tsx` — Grant leadership status to God Mode users**
- Update the `isLeadership` computation to include God Mode:
  ```typescript
  const { isImpersonating } = useOrganizationContext();
  const isLeadership = isImpersonating
    ? true  // God Mode = full access
    : isViewingAs
      ? roles.includes('super_admin') || roles.includes('manager')
      : profile?.is_super_admin || roles.includes('super_admin') || roles.includes('manager');
  ```
- This ensures all leadership-gated UI (analytics, insights, customize sections) is visible in God Mode

**3. `src/components/dashboard/DashboardLayout.tsx` — Treat God Mode as leadership for layout**
- Update `isLeadershipUser` to include `isImpersonating`:
  ```typescript
  const isLeadershipUser = isImpersonating || actualRoles.includes('super_admin') || ...
  ```

**4. `src/components/auth/ProtectedRoute.tsx` — Bypass permission checks for God Mode**
- Platform users impersonating an org already bypass via `isPlatformUser` check — verify this covers all paths (it does for `requiredPermission` checks)

**5. RLS audit (database)** — Ensure key tables allow platform user writes
- Audit tables commonly written from the dashboard (`tasks`, `user_preferences`, `dashboard_element_visibility`, `announcements`, etc.) to confirm `is_platform_user(auth.uid())` is in their write policies
- Add the bypass to any table missing it via a single migration

### Technical Details

- `isImpersonating` comes from `OrganizationContext` and is `true` when a platform user has selected an org to view
- `is_platform_user(auth.uid())` is an existing database function that checks platform role membership
- The `ProtectedRoute` already bypasses permission checks for `isPlatformUser`, so route-level access is already covered
- The primary gaps are in component-level role checks and mutation guards within hooks

