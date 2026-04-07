

# Fix Level Configuration Status to Reflect Retention Monitoring

## Problem

The "Configured" badge on levels 2+ only checks whether **promotion criteria** exist. It ignores whether **retention monitoring** has been set up. In the screenshot, levels 2, 3, 4, 5, and 7 show "Configured" even though their retention section shows "—" (no retention criteria). This gives a false sense of completeness.

## Solution

Introduce a tri-state configuration status instead of a binary configured/incomplete:

| Status | Condition | Badge |
|---|---|---|
| **Configured** | Promotion criteria active AND retention criteria active (or Level 1 with retention active) | Green "Configured" |
| **Retention Not Set** | Promotion criteria active but NO retention criteria | Amber "Retention Not Set" |
| **Incomplete** | No promotion criteria (or Level 1 with no retention) | Amber "Incomplete" |

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Update `isConfigured` derivation (lines 1523-1530)**

Change from a boolean to also track whether retention is missing. Add a new field `configStatus: 'configured' | 'retention_not_set' | 'incomplete'` to the level state type (line 302-305), computed as:

- Level 1: `configured` if retention criteria exists and is active; otherwise `incomplete`
- Levels 2+: 
  - `configured` if promotion AND retention criteria both exist and are active
  - `retention_not_set` if promotion criteria exists but retention does not
  - `incomplete` if no promotion criteria exists
- Manual override (`is_configured` flag in DB) still forces `configured`

Keep `isConfigured` as a derived boolean (`configStatus === 'configured'`) for backward compatibility with PDF exports and roadmap.

**2. Update comparison table badge (lines 972-980)**

Render three badge variants:
- Green "Configured" — fully set up
- Amber "Retention Not Set" — promotion done, retention missing
- Amber "Incomplete" — nothing set up

**3. Update edit dialog badge (line 2355)**

Same tri-state badge in the individual level edit panel.

**4. PDF exports**

The `LevelRequirementsPDF.ts` and `LevelRoadmapView.tsx` already consume `isConfigured` as a boolean — they will continue to work since we keep that derived field. The "Retention Not Set" state will render as "Setup Incomplete" in PDFs, which is accurate.

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Add `configStatus` field, update derivation logic, update badge rendering in table headers and edit dialog |

1 file modified. No database changes.

