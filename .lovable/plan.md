

## Bug: Today's Prep Card Duplicates on Unpin

### Root Cause

Confirmed by querying the database — your `sectionOrder` array currently contains `todays_prep` **three times**:

```text
[todays_prep, todays_prep, pinned:sales_overview, announcements, ..., todays_prep, ...]
```

This happened because:

1. The `orderedUnifiedItems` memo (line 257-266 of `DashboardCustomizeMenu.tsx`) iterates over `savedOrder` and pushes **every** occurrence of a valid section ID — it never checks if the ID is already in `result` before adding it
2. Every save (toggle, drag, unpin) writes `orderedUnifiedItems` back as the new `sectionOrder`, persisting the duplicates
3. Multiple migration passes (for `ai_insights`, `hub_quicklinks`, `todays_prep`) likely inserted `todays_prep` into `sectionOrder` at different points over time, and the duplication was never cleaned

### Fix (Two Parts)

**1. `src/components/dashboard/DashboardCustomizeMenu.tsx` — Deduplicate `orderedUnifiedItems`**

Add a duplicate check at line 258 so items from `savedOrder` are only added once:

```typescript
for (const id of savedOrder) {
  if (result.includes(id)) continue;  // ← ADD THIS LINE
  if (sectionIds.includes(id)) {
    result.push(id);
  } else if (isPinnedCardEntry(id)) {
    ...
  }
}
```

This single line prevents duplicates from propagating. Future saves will write a clean, deduplicated array.

**2. `src/hooks/useDashboardLayout.ts` — Deduplicate during migration**

Add a deduplication pass at the end of `migrateLayout` (before the return) to clean up any existing dirty data:

```typescript
// Deduplicate sections and sectionOrder
migrated.sections = [...new Set(migrated.sections)];
migrated.sectionOrder = [...new Set(migrated.sectionOrder)];
return migrated;
```

This ensures that even if the stored data has duplicates, they're cleaned on load — fixing the issue for existing users without requiring a database migration.

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/DashboardCustomizeMenu.tsx` | Add `result.includes(id)` guard in `orderedUnifiedItems` memo |
| `src/hooks/useDashboardLayout.ts` | Add `[...new Set()]` deduplication at end of `migrateLayout` |

