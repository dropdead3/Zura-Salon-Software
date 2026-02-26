

## Bug: Today's Prep Resets Position on Toggle Off

### Root Cause

The migration logic in `useDashboardLayout.ts` (line 113) checks `migrated.sections` to decide if `todays_prep` needs to be added. But `sections` is the **enabled** list — when you toggle a section OFF, it's removed from `sections`. On the next load, the migration sees `todays_prep` missing from `sections` and re-inserts it at position after `ai_insights`, resetting both its position and its enabled state.

The same bug affects `hub_quicklinks`, `ai_insights`, and `payroll_deadline` — any section with a migration block that checks only `sections` will snap back if toggled off. But `todays_prep` is the most visible because users actively reorder it.

### Fix

Change all four migration checks from `migrated.sections` to `migrated.sectionOrder`. The `sectionOrder` array contains ALL items regardless of enabled state — it's never pruned on toggle. If an item is in `sectionOrder`, it has already been migrated and should not be re-added.

**`src/hooks/useDashboardLayout.ts`** — Four changes:

1. **Line 95**: `hub_quicklinks` migration  
   Change `!migrated.sections?.includes('hub_quicklinks')` → `!migrated.sectionOrder?.includes('hub_quicklinks')`

2. **Line 104**: `ai_insights` migration  
   Change `!migrated.sections?.includes('ai_insights')` → `!migrated.sectionOrder?.includes('ai_insights')`

3. **Line 113**: `todays_prep` migration  
   Change `!migrated.sections?.includes('todays_prep')` → `!migrated.sectionOrder?.includes('todays_prep')`

4. **Line 128**: `payroll_deadline` migration  
   Change `!migrated.sections?.includes('payroll_deadline')` → `!migrated.sectionOrder?.includes('payroll_deadline')`

Each migration block also adds to `sections` (the enabled list), which is correct for first-time migration — new sections should default to enabled. But the guard must check `sectionOrder` so it only fires once, not every time a user disables the section.

### Files Changed

| File | Action |
|------|--------|
| `src/hooks/useDashboardLayout.ts` | Change 4 migration guards from `sections` to `sectionOrder` |

