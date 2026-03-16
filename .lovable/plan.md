

# Fix: Backroom Paywall Not Reflecting Master Switch State

## Root Cause

There are two separate tables:
- `organization_feature_flags` — where the platform admin "Master Switch" writes `backroom_enabled`
- `organization_features` — where `useOrganizationFeature()` reads from (the feature catalog system)

`useBackroomEntitlement` calls `useOrganizationFeature('backroom_enabled')`, which queries the wrong table. The flag is never found, so the org-level check fails and the paywall is shown.

The comment in `useBackroomEntitlement.ts` even says *"Uses the organization_feature_flags system"* — but the implementation doesn't.

## Fix

**File:** `src/hooks/backroom/useBackroomEntitlement.ts`

Replace the `useOrganizationFeature('backroom_enabled')` call with a direct query to `organization_feature_flags` where `flag_key = 'backroom_enabled'` and `organization_id = orgId`.

```typescript
// Instead of:
const { isEnabled: orgEnabled, isLoading: orgLoading } =
  useOrganizationFeature('backroom_enabled');

// Use a direct query:
const { data: orgEnabled = false, isLoading: orgLoading } = useQuery({
  queryKey: ['backroom-org-flag', orgId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('organization_feature_flags')
      .select('is_enabled')
      .eq('organization_id', orgId!)
      .eq('flag_key', 'backroom_enabled')
      .maybeSingle();
    if (error) throw error;
    return data?.is_enabled ?? false;
  },
  enabled: !!orgId,
  staleTime: 60_000,
});
```

This aligns the entitlement check with the same table that the platform admin, Stripe webhook, and admin-activate edge function all write to.

## Scope
- Single file change: `src/hooks/backroom/useBackroomEntitlement.ts`
- Add imports for `useQuery` and `supabase`
- No database changes needed

