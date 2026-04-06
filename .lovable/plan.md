

# Enable Retention Minimums for Level 1 (Base Level)

## Problem
Level 1 (New Talent) is the base level — it has no promotion criteria, so all KPI rows display "N/A". But the salon still needs to set **minimum thresholds to stay** at Level 1 (retention minimums). The database already has `revenue_minimum`, `retail_pct_minimum`, etc. on `level_retention_criteria`, but the UI never exposes them for the base level.

## Solution
Instead of showing "N/A" for all promotion KPIs on Level 1, show and allow editing of the **retention minimum** values. This makes it clear: "You don't need these to get promoted (you're already here), but you need them to stay."

### Changes in `StylistLevelsEditor.tsx`

**1. Update `isPromotionSkip` logic**
Currently, `isPromotionSkip = metric.section === 'promotion' && isBaseLevel` blankets all promotion KPIs as "N/A" for Level 1. Change this so only Tenure, Eval Window, and Approval skip — the editable KPIs (Revenue, Retail %, Rebooking %, etc.) should render the retention minimum instead.

**2. Modify `renderMetricCell` for base level KPIs**
When `isBaseLevel` and the metric is an editable promotion KPI:
- **Read mode**: Display the retention minimum value (e.g., `$3K`) from `retention.revenue_minimum` instead of "N/A"
- **Edit mode**: Save to the retention fields (`retEnabledField` / `retValueField`) instead of promotion fields
- Add a subtle visual indicator (e.g., muted label or different text color) to signal these are "minimums to stay" rather than promotion targets

**3. Update `startEditing` to load retention values for Level 1**
When initializing edit values for a row, if the level is the base level, pull from the retention criteria fields instead of promotion criteria fields.

**4. Update `saveRow` to write retention for Level 1**
When saving an editable KPI row, if the level is the base level, upsert into `level_retention_criteria` using `retEnabledField`/`retValueField` instead of the promotion table. Also set `retention_enabled: true` on the retention record.

**5. Update section header subtitle for base level**
Add a note in the Promotion section header row that says something like "Level 1 values are retention minimums" to avoid confusion.

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx`

### No database changes
The `level_retention_criteria` table already has all the necessary columns (`revenue_enabled`, `revenue_minimum`, `retail_pct_minimum`, etc.).

