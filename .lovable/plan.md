

# Wire Wizard and Inline Matrix Together

## Problem

The inline criteria matrix (table) and the per-level GraduationWizard are two separate UIs editing the same `level_promotion_criteria` data, but they can get out of sync. The inline table saves via raw Supabase calls, while the wizard uses dedicated mutation hooks — and the wizard doesn't always reflect values saved from the matrix.

## Root Cause

Two issues:

1. **Inline table bypasses the mutation hooks** — it calls `supabase.from('level_promotion_criteria').upsert(...)` directly (StylistLevelsEditor.tsx ~line 412), then manually invalidates queries. This works for the table's own parent query but can miss the wizard's per-level query key if timing is off.

2. **Wizard defaults to INITIAL_STATE when no `existing` data is found** — if the per-level query hasn't re-fetched after an inline save, the wizard shows all toggles as OFF even though data exists in the DB.

## Fix

### A. Inline table: use the same upsert mutation hook

Replace the raw `supabase.from().upsert()` calls inside `saveMetricRow` with `useUpsertLevelPromotionCriteria` and `useUpsertLevelRetentionCriteria`. This ensures cache invalidation is consistent — same hooks, same query key invalidation, same toast feedback.

Since the inline save iterates multiple levels, we'll call the mutation sequentially (awaiting each with `mutateAsync`), which matches the existing behavior but routes through the shared hooks.

### B. Ensure wizard query keys match invalidation

Verify that `useLevelPromotionCriteriaForLevel` query key `['level-promotion-criteria', orgId, stylistLevelId]` is invalidated when the parent key `['level-promotion-criteria', orgId]` is invalidated. React Query matches by prefix, so this should already work — but we'll add an explicit `await queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria'] })` (no orgId suffix) as a safety net in the inline save path.

### C. Wizard: await fresh data before hydrating

Add `refetchOnMount: 'always'` to `useLevelPromotionCriteriaForLevel` when the wizard is open, ensuring it always hits the server when opened rather than relying on potentially stale cache.

## Files Modified

- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — refactor `saveMetricRow` to use mutation hooks instead of raw Supabase calls
- `src/hooks/useLevelPromotionCriteria.ts` — add `refetchOnMount: 'always'` to the per-level query

## No Database Changes

