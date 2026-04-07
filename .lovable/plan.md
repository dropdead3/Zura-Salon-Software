

# Reconstruct Level Criteria Wizard for Base Level (Level 1)

## Problem

Level 1 (the base level) has **no promotion requirements** — every stylist starts here. It only has "Required to Stay" retention criteria. But the wizard currently:

1. Opens on the "Level Requirements" tab by default — showing empty KPI toggles with a disabled "Next" button
2. The "Required to Stay" tab says "KPI Minimums Inherited" from promotion criteria — but Level 1 has none, so nothing is inherited
3. The retention save handler (`handleSaveRetention`) copies KPI values from the promotion form, which is empty for Level 1

This makes the wizard unusable for Level 1.

## Fix

**File:** `src/components/dashboard/settings/GraduationWizard.tsx`

### 1. Default to retention tab for Level 1
Line 486: Change condition from `levelIndex === totalLevels - 1` to `levelIndex === 0 || levelIndex === totalLevels - 1` — both the base level and the top level skip promotion requirements.

### 2. Disable the "Level Requirements" tab for Level 1
Line 680: Same condition change — disable the promotion tab button for `levelIndex === 0` (base level), matching the existing pattern for the last level.

### 3. Show independent KPI toggles on retention tab for Level 1
When `levelIndex === 0`, replace the "KPI Minimums Inherited" info box (lines 1063-1074) with the full list of retention KPI toggles using `RETENTION_CRITERIA`. Each toggle shows the metric name, info tooltip, switch, and threshold input — similar to the promotion step 0 UI but using `retForm` fields (`enabledKey` / `minimumKey`).

### 4. Fix retention save for Level 1
In `handleSaveRetention` (lines 587-620), when `levelIndex === 0`, use `retForm` field values directly instead of inheriting from the empty promotion `form`. For all other levels, keep the existing inheritance behavior.

### 5. Update description text
- On the retention tab for Level 1, change the "Enable Retention Monitoring" subtitle to: "Set minimum performance standards for stylists at this level"
- Add a contextual note: "As the entry level, these are the baseline standards all stylists must maintain."

## Scope
- Single file: `GraduationWizard.tsx`
- No database changes — retention criteria table already supports independent KPI values
- No new components needed

