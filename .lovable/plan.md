

# Optimistic Wizard Hydration from Cache

## Problem

When opening the GraduationWizard after saving from the inline matrix, there's a brief loading flash. The wizard waits for `useLevelPromotionCriteriaForLevel` to refetch from the server before hydrating the form, even though the data already exists in the React Query cache.

## Solution

Use React Query's `placeholderData` (or read from the cache synchronously via `queryClient.getQueryData`) so the wizard form hydrates instantly from cached data while the background refetch runs.

### Changes to `GraduationWizard.tsx`

1. **Import `useQueryClient`** from `@tanstack/react-query`
2. **Read cached promotion criteria** synchronously when the wizard opens:
   - Use `queryClient.getQueryData(['level-promotion-criteria', orgId])` to find the matching level's criteria from the bulk query cache
   - If found, use it as the initial form state immediately (before the per-level query resolves)
3. **Read cached retention criteria** the same way from `['level-retention-criteria', orgId]`
4. **Adjust the hydration `useEffect`**: Keep the existing effect as-is — when the per-level query resolves with fresh server data, it overwrites the cache-seeded values. No visual flash since the data will match.

### Implementation Detail

Add a second `useEffect` (or adjust the existing one) that runs on `open` change:

```typescript
useEffect(() => {
  if (!open || !levelId) return;
  // Try to seed from bulk cache immediately
  const cached = queryClient.getQueryData<LevelPromotionCriteria[]>(
    ['level-promotion-criteria', orgId]
  );
  const match = cached?.find(c => c.stylist_level_id === levelId);
  if (match) {
    setForm({ /* map match fields to FormState */ });
  }
}, [open, levelId]);
```

The existing `[existing, open, isLoading]` effect still runs and overwrites with authoritative server data — but since the values match, there's no flicker.

Same pattern for retention form with `['level-retention-criteria', orgId]`.

## Files Modified

- `src/components/dashboard/settings/GraduationWizard.tsx` — add cache-seeded initial hydration

## No database changes.

