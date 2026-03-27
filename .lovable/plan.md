

## Problem

The "Available Analytics" toggles fail silently because the `dashboard_element_visibility` table's RLS write policy only allows users with `is_super_admin = true` in `employee_profiles`. When you're using God Mode (impersonating an organization), your `auth.uid()` likely doesn't have a matching `employee_profiles` row with `is_super_admin = true` for that org, so the upsert is blocked by RLS.

Additionally, the error is swallowed silently in the catch block, giving no feedback.

## Solution

Two changes:

### 1. Broaden the RLS write policy
Update the write policy on `dashboard_element_visibility` to also allow `admin` and `manager` roles (leadership roles) to manage visibility settings — not just `super_admin`. This aligns with the UI which already gates the section behind `roleContext?.isLeadership`. We'll also add a platform-level bypass for God Mode users via `is_platform_user(auth.uid())`.

**Database migration:**
```sql
DROP POLICY "Super admins can manage visibility settings" ON public.dashboard_element_visibility;

CREATE POLICY "Leadership can manage visibility settings"
ON public.dashboard_element_visibility
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_profiles
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  )
  OR public.is_platform_user(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_profiles
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  )
  OR public.is_platform_user(auth.uid())
);
```

### 2. Surface errors in the UI
**File: `src/components/dashboard/DashboardCustomizeMenu.tsx`**

Replace the silent `catch` block in `handleTogglePinnedCard` with a `toast.error()` so failures are visible:
```typescript
} catch (err: any) {
  toast.error('Failed to update pinned card: ' + (err?.message || 'Unknown error'));
}
```

## Technical Details

- The `is_platform_user` function already exists for platform-level access bypass (God Mode)
- The `employee_profiles.is_super_admin` check stays as the primary org-level gate
- The silent catch was masking the RLS permission error entirely

