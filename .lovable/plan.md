

## Bug Fix Pass — Deselect/Untrack Cleanup

### Bugs Found

1. **Billing deselect sends `billing_mode: null` — will fail**
   The `billing_mode` column is non-nullable (`string`, not `string | null`) and the TypeScript type is `'allowance' | 'parts_and_labor'`. The current deselect code (lines 931–942) calls `upsertPolicy.mutate({ billing_mode: null, ... })` which will error at the database. The correct action is to **delete the policy row** instead of upserting null values.

2. **Toggling tracking OFF leaves orphaned billing policy**
   The `toggleTracking` mutation (lines 180–205) resets service flags but does not delete the associated allowance policy. The `executeReset` function (line 280+) properly deletes the policy, but the simple Switch toggle path skips this. A user who toggles a service off and back on will find stale billing configuration.

3. **Toast feedback wrong on deselect**
   Even if the upsert somehow succeeded, it would show "Allowance policy saved" — misleading when the user is *removing* a selection.

### Fix Plan

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Fix 1+3 — Lines 931–942 (billing deselect handler):**
Replace the `upsertPolicy.mutate(...)` call with `deletePolicy.mutate(policy.id)` when `active` is true and a policy exists. This correctly removes the row and shows "Allowance policy removed" toast. If no policy exists (edge case), do nothing.

```typescript
if (active) {
  const policy = allowanceByService.get(service.id);
  if (policy) {
    deletePolicy.mutate(policy.id);
  }
} else {
  // existing select logic
}
```

**Fix 2 — Lines 191–203 (toggleTracking.onSuccess):**
When `variables.tracked` is `false`, also delete the associated allowance policy if one exists. Access `allowanceByService` to find the policy and call `deletePolicy.mutate()`.

```typescript
onSuccess: (_data, variables) => {
  queryClient.invalidateQueries({ queryKey: ['color-bar-services'] });
  queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (variables.tracked) {
      next.add(variables.id);
    } else {
      next.delete(variables.id);
      // Clean up orphaned billing policy
      const policy = allowanceByService.get(variables.id);
      if (policy) {
        deletePolicy.mutate(policy.id);
      }
    }
    return next;
  });
},
```

### Result
- Deselecting a billing method deletes the policy row (no null-column error)
- Toggling tracking off cleans up the billing policy (no orphaned data)
- Toast messages accurately reflect the action taken

