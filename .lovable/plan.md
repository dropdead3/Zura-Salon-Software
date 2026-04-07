

# Fix: Auto-Detect Level Configuration Status

## Problem

The roadmap's "Setup Incomplete" / "Configured" status is driven by a **manual toggle** ("Mark as Configured") buried inside the level editor card. Saving promotion or retention criteria does NOT update this flag. You configured New Talent's retention and clicked Save, but the `is_configured` field in the database was never flipped — it requires a separate, easy-to-miss manual action.

This is poor UX. Users reasonably expect that completing and saving criteria marks a level as configured.

## Proposed Fix

Replace the manual toggle with **automatic detection** based on whether meaningful criteria exist for each level.

### Detection Logic

A level is considered "configured" when:
- **Level 1 (base level, index 0):** Has active retention criteria saved (since base levels have no promotion criteria)
- **Levels 2+ :** Has active promotion criteria saved (retention is optional/inherited)

This mirrors the actual governance model: Level 1 needs retention minimums; higher levels need promotion thresholds.

### Technical Changes

**1. Remove the manual "Mark as Configured" toggle UI**

File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

Remove the toggle block (~lines 2314-2334) from the level card expanded view. This eliminates the confusing manual step.

**2. Compute `isConfigured` dynamically from criteria data**

In the same file, where `levels` state is built from DB data (~line 1512), replace:
```ts
isConfigured: l.is_configured ?? false
```
with a computed value based on whether promotion criteria (for levels 2+) or retention criteria (for level 1) exist and are active. This requires checking the already-loaded `promotionCriteria` and `retentionCriteria` arrays.

**3. Update the roadmap to use the same derived status**

File: `src/components/dashboard/settings/LevelRoadmapView.tsx`

No structural changes needed — it already reads `isConfigured` from the level objects passed in. The computed value will flow through automatically.

**4. Keep the `is_configured` DB column as a cache/override**

Optionally update `is_configured` in the database when criteria are saved (in the upsert mutation's `onSuccess`), so the value persists without needing to re-derive. This keeps the roadmap accurate even before criteria data loads.

### Alternative: Simpler Approach

If the manual toggle is intentionally part of a "review and confirm" workflow, instead of removing it:
- **Auto-flip it to true** when criteria are saved successfully (in the `useUpsertLevelPromotionCriteria` and `useUpsertLevelRetentionCriteria` `onSuccess` callbacks)
- Keep the toggle visible but make it pre-checked after save
- This preserves the ability to manually un-configure a level if needed

### Recommendation

The simpler approach (auto-flip on save) is lower risk and preserves the admin's ability to manually override. The toggle stays but is no longer the only way to mark configuration complete.

## Scope
- 1-2 files modified
- ~15 lines changed
- No database migration needed (column already exists)

