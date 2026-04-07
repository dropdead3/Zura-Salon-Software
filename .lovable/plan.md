

# Fix: Retention Settings Still Not Updating After Save

## Problem
Despite the previous `await` fix, the Criteria Comparison Table's "Action" cell (showing "Demotion" vs "Coaching") does not reflect changes saved in the GraduationWizard. The database is correct (network response confirms `coaching_flag`), but the table doesn't re-render with fresh data reliably.

## Root Cause
The `upsertRetention.mutate()` fires two `onSuccess` handlers: the hook-level one (non-awaited) and the component-level one (awaited). While the component-level `await` should sequence correctly, using `.mutate()` with async callbacks has subtle timing issues — the hook-level `onSuccess` invalidates with the org-scoped key while the component-level one uses a broader key. Additionally, `updateLevel.mutate()` fires immediately after the awaits, triggering yet another cascade of invalidations that can race with React's render cycle.

## Fix

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

**Switch from `mutate` to `mutateAsync`** for both the promotion and retention save paths. This gives proper promise control over the full mutation lifecycle, ensuring all invalidations complete before any dialog close or level update:

```typescript
// handleSaveRetention
const handleSaveRetention = async () => {
  // ... payload construction stays the same ...
  await upsertRetention.mutateAsync(payload);
  // Hook-level onSuccess has already fired and invalidated
  // Now explicitly await broader invalidation for the parent table
  await queryClient.invalidateQueries({ queryKey: ['level-retention-criteria'] });
  await queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria'] });
  updateLevel.mutate({ id: levelId, is_configured: true });
  onOpenChange(false);
};
```

Apply the same `mutateAsync` pattern to `handleSave` (promotion save). This eliminates the split between hook-level and component-level callbacks and gives deterministic ordering.

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/settings/GraduationWizard.tsx` | Switch retention and promotion saves from `mutate` with async `onSuccess` to `mutateAsync` with sequential awaits |

1 file modified. No database changes.

