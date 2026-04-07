

# Relabel "Tenure" to "Level Tenure" Across All Surfaces

## Problem
The KPI labeled "Tenure" is ambiguous — it could be interpreted as total salon employment tenure rather than time spent at the current level.

## Changes

### 1. `src/components/dashboard/settings/StylistLevelsEditor.tsx`
- Change the row label from `'Tenure'` to `'Level Tenure'` in the `metricRows` array (~line 438)
- Update the `METRIC_FIELD_MAPPING` key from `'Tenure'` to `'Level Tenure'` (~line 344)
- Update the tooltip text from `'Tenure': 'Minimum days at current level...'` to `'Level Tenure': ...` (~line 390)
- Update all references that check `label !== 'Tenure'` to `label !== 'Level Tenure'` (~lines 492, 534, 694)

### 2. `src/components/dashboard/settings/GraduationWizard.tsx`
- Change the label from `"Minimum Tenure"` to `"Level Tenure"` (~line 914)
- Keep the sub-label "Time at current level before eligible" as-is (already clear)

### 3. `src/hooks/useLevelProgress.ts`
- Change `label: 'Tenure'` to `label: 'Level Tenure'` (~line 548)

### 4. `src/hooks/useTeamLevelProgress.ts`
- Change `label: 'Tenure'` to `label: 'Level Tenure'` (~line 438)

### 5. `src/components/dashboard/LevelProgressionLadder.tsx`
- Change `formatThreshold('Tenure', ...)` to `formatThreshold('Level Tenure', ...)` (~line 41)

## Files Changed
| File | Change |
|---|---|
| `StylistLevelsEditor.tsx` | Rename label, mapping key, tooltip, and conditional checks |
| `GraduationWizard.tsx` | Rename toggle label |
| `useLevelProgress.ts` | Rename progress item label |
| `useTeamLevelProgress.ts` | Rename progress item label |
| `LevelProgressionLadder.tsx` | Rename threshold label |

5 files, no database changes.

