

## God Mode Dashboard Customization — Save to Org Owner

### Problem
When a platform super admin is in God Mode (viewing an organization), dashboard customization changes (section toggles, reorder, analytics pinning, widget toggles) are saved to the **platform admin's own** `user_preferences` instead of the **organization's Account Owner's** preferences. The analytics visibility toggles write to `dashboard_element_visibility` which is global and works correctly, but the layout persistence (`sectionOrder`, `pinnedCards`, `widgets`, `hubOrder`) is user-scoped and targets the wrong user.

### Root Cause
- `useSaveDashboardLayout` uses `useAuth().user.id` (the platform admin) for all reads and writes to `user_preferences.dashboard_layout`
- `useDashboardLayout` similarly reads from the platform admin's preferences
- No mechanism exists to resolve the org owner's user ID during God Mode

### Approach
When God Mode is active (`isImpersonating` from `OrganizationContext`), resolve the selected organization's primary owner (`is_primary_owner = true` on `employee_profiles`) and use their user ID for reading and writing dashboard layout preferences.

### Changes

**1. Create `useGodModeTargetUserId` hook** (`src/hooks/useGodModeTargetUserId.ts`)
- When `isImpersonating` is true, queries `employee_profiles` for the selected org's `is_primary_owner = true` user
- Returns the org owner's `user_id`, or falls back to the current user
- Cached with staleTime to avoid repeated lookups

**2. Update `useDashboardLayout` in `src/hooks/useDashboardLayout.ts`**
- Import and use `useGodModeTargetUserId` to get the target user ID
- Read `user_preferences.dashboard_layout` using the target user ID instead of `user.id`
- Update query key to include the target user ID

**3. Update `useSaveDashboardLayout` in `src/hooks/useDashboardLayout.ts`**
- Accept an optional `targetUserId` parameter
- When provided, write to that user's `user_preferences` instead of `user.id`
- RLS already allows this: "Platform users can manage all preferences" policy exists

**4. Update `DashboardCustomizeMenu.tsx`**
- Pass the target user ID through to `saveLayout` calls
- This ensures section toggles, drag reorder, widget toggles, hub toggles, and reset-to-default all write to the org owner's preferences

**5. Update `useResetToDefault` in `src/hooks/useDashboardLayout.ts`**
- Same target user ID override for God Mode

### Technical Details

**Target user resolution:**
```typescript
// useGodModeTargetUserId.ts
export function useGodModeTargetUserId(): string | undefined {
  const { user } = useAuth();
  const { isImpersonating, selectedOrganization } = useOrganizationContext();
  
  const { data: ownerUserId } = useQuery({
    queryKey: ['org-primary-owner', selectedOrganization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id')
        .eq('organization_id', selectedOrganization!.id)
        .eq('is_primary_owner', true)
        .maybeSingle();
      return data?.user_id ?? null;
    },
    enabled: isImpersonating && !!selectedOrganization?.id,
  });
  
  return isImpersonating ? (ownerUserId ?? user?.id) : user?.id;
}
```

**Save mutation change:**
```typescript
export function useSaveDashboardLayout(overrideUserId?: string) {
  const { user } = useAuth();
  const targetId = overrideUserId || user?.id;
  // ... use targetId instead of user.id for all reads/writes
}
```

**No database changes needed** — RLS already has "Platform users can manage all preferences" policy on `user_preferences`, and "Leadership can manage visibility settings" on `dashboard_element_visibility` with `is_platform_user()` bypass.

### Files Modified
- `src/hooks/useGodModeTargetUserId.ts` (new)
- `src/hooks/useDashboardLayout.ts` (read/write target user)
- `src/components/dashboard/DashboardCustomizeMenu.tsx` (pass target user)

