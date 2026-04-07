

# Fix: Retention Settings Not Displaying After Save

## Problem
After saving retention criteria via the GraduationWizard for a level (e.g., Level 5 Senior Artist), the Criteria Comparison Table still shows dashes for that level's retention row. The data IS correctly saved to the database — the issue is that the table's query cache doesn't reliably refetch after the wizard closes.

## Root Cause
The GraduationWizard's `handleSaveRetention` closes the dialog (`onOpenChange(false)`) inside the mutation's component-level `onSuccess`, which fires alongside the hook-level `onSuccess` that calls `queryClient.invalidateQueries`. The invalidation marks the parent's `useLevelRetentionCriteria` query as stale, but the refetch may not complete before the table re-renders — or the invalidation may race with the dialog unmount. Additionally, the wizard doesn't explicitly invalidate the broader parent query key, relying solely on the hook's `onSuccess`.

## Fix

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

**In `handleSaveRetention` (line ~638):** Instead of closing the dialog immediately on mutation success, await the query invalidation before closing. Use `queryClient` (already available via the wizard's imports) to explicitly invalidate and await refetch of the parent retention criteria query:

```typescript
upsertRetention.mutate(payload, {
  onSuccess: async () => {
    // Ensure parent table query refetches BEFORE closing dialog
    await queryClient.invalidateQueries({ queryKey: ['level-retention-criteria'] });
    await queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria'] });
    updateLevel.mutate({ id: levelId, is_configured: true });
    onOpenChange(false);
  },
});
```

This ensures the comparison table's data source has been refreshed before the dialog unmounts. The `invalidateQueries` with `await` waits for the refetch to complete.

**Also apply the same pattern to `handleSave` (promotion save)** — ensure both save paths await invalidation before closing.

### File: `src/hooks/useLevelRetentionCriteria.ts`

No changes needed — the hook's invalidation is correct, but the wizard's explicit `await` will guarantee ordering.

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/settings/GraduationWizard.tsx` | Await query invalidation before closing dialog on retention and promotion save |

1 file modified. No database changes.

