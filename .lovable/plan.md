

# Stylist Levels Editor — Gaps, Bugs & Enhancements

## Bugs Found

### 1. Duplicate import alias — `ChevronDown` imported twice (line 24 + 29)
`ChevronDown` is imported normally on line 24, then aliased again as `ChevronDownIcon` on line 29. This is unnecessary and confusing — just use `ChevronDown` everywhere.

### 2. `stylistsByLevel` query not scoped to organization
The query on line 342 fetches **all** `employee_profiles` across organizations with no `organization_id` filter. This violates tenant isolation and will show incorrect counts for multi-org setups.

### 3. Criteria table "Configure" button crashes on unsaved levels
On line 1004, `level.dbId!` is force-unwrapped. If an admin adds a new level (unsaved, no `dbId`) and clicks a "Configure" button that slips through, this throws. The guard on line 221 (`!level.dbId`) protects most paths but the column header "Edit" button on line 182 does not check for `dbId` existence.

### 4. `hasChanges` toast fires repeatedly
The `useEffect` on line 333 fires a toast every time `hasChanges` becomes true. Multiple rapid edits (rename + reorder) trigger duplicate toasts. The `id: 'unsaved-changes'` deduplicates visually but the effect still runs needlessly.

## Gaps

### 5. No org scope on criteria comparison table
The `CriteriaComparisonTable` receives already-filtered data, so this is fine — but if `promotionCriteria` or `retentionCriteria` queries return `undefined` during loading, the table shows "No levels configured" rather than a loading state.

### 6. Criteria tab has no loading/error state
When promotion/retention criteria are still loading, the Criteria tab renders immediately with empty data, showing all dashes. There's no skeleton or spinner indicating data is in flight.

### 7. Tab comment says "TAB 3" twice (lines 1011 and 1024)
Minor: both Team Roster and Previews tabs are labeled `TAB 3` in comments.

## Enhancements

### 8. Progression Roadmap duplicates the Criteria tab
The "Progression Roadmap" section (lines 963-993) inside the Levels tab is now redundant — the Criteria tab shows the same information in a better format. Remove it to reduce clutter.

### 9. Team Distribution bar has no percentage label
The distribution bars show count but not percentage. Adding a small `12%` label would improve scannability.

---

## Plan

| # | File | Change |
|---|------|--------|
| 1 | `StylistLevelsEditor.tsx` | Remove duplicate `ChevronDown as ChevronDownIcon` import; use `ChevronDown` directly |
| 2 | `StylistLevelsEditor.tsx` | Add `.eq('organization_id', orgId)` to `stylistsByLevel` query and add `orgId` to queryKey |
| 3 | `StylistLevelsEditor.tsx` | Add `dbId` guard on criteria table header "Edit" button (line 182) |
| 4 | `StylistLevelsEditor.tsx` | Remove the `hasChanges` toast `useEffect` — the save/discard buttons are sufficient UX signal |
| 5 | `StylistLevelsEditor.tsx` | Add loading state to Criteria tab when `promotionCriteria` or `retentionCriteria` are undefined |
| 6 | `StylistLevelsEditor.tsx` | Fix tab comments (TAB 3 → TAB 4 for Previews) |
| 7 | `StylistLevelsEditor.tsx` | Remove Progression Roadmap section (redundant with Criteria tab) |
| 8 | `StylistLevelsEditor.tsx` | Add percentage labels to Team Distribution bars |

**0 new files, 1 modified file, 0 migrations.**

