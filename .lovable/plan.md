

# Unify Retention with Promotion KPIs

## The Insight

You're right — if a stylist must hit $15K revenue to *earn* Level 4, then $15K is also what they need to *maintain* Level 4. Configuring those thresholds separately is redundant, error-prone, and confusing. Retention should inherit promotion thresholds automatically.

The only retention-specific settings are:
- **Evaluation window** (how many days to look back — e.g., 90 days)
- **Grace period** (how long below threshold before action)
- **Action type** (coaching flag vs. demotion eligible)

## What Changes

### A. Comparison Table (`StylistLevelsEditor.tsx`)

Remove the entire "Retention — Required to Stay" KPI rows (Revenue, Retail %, Rebooking %, etc.) from the table. Replace with a single compact row or small config section showing only:

```text
┌──────────────────┬──────────┬──────────┬──────────┬──────────┐
│ LEVEL REQUIREMENTS                                            │
│ Revenue          │   —      │ $15,000  │ $20,000  │ $28,000  │
│ Retail %         │   —      │ 10%      │ 12%      │ 15%      │
│ ...              │          │          │          │          │
├──────────────────┼──────────┼──────────┼──────────┼──────────┤
│ RETENTION POLICY                                              │
│ Eval Window      │  90d     │  90d     │  90d     │  90d     │
│ Grace Period     │  30d     │  30d     │  30d     │  30d     │
│ Action           │ Coaching │ Coaching │ Demotion │ Demotion │
└──────────────────┴──────────┴──────────┴──────────┴──────────┘
```

The retention KPI thresholds simply mirror promotion — no separate "Configure" buttons for retention KPIs.

### B. GraduationWizard — Retention Tab

Remove the per-metric toggles and threshold inputs from the "Required to Stay" tab. Replace with a simplified form:

- **Retention Enabled** toggle (master on/off)
- **Evaluation Window** selector (30 / 60 / 90 days)
- **Grace Period** selector (14 / 30 / 60 / 90 days)
- **Action Type** (Coaching Flag / Demotion Eligible)
- A read-only summary: "KPI minimums are inherited from Level Requirements above"

### C. Runtime Logic (`useLevelProgress.ts`)

Update the retention evaluation to read KPI thresholds from the **current level's promotion criteria** instead of `level_retention_criteria`. The retention record is still used but only for `evaluation_window_days`, `grace_period_days`, and `action_type`.

Mapping: promotion `revenue_threshold` → retention `revenue_minimum`, etc. The `_enabled` flags also come from promotion criteria.

### D. Save Logic

When saving retention criteria via upsert, auto-populate the KPI fields from the promotion criteria for that level. This keeps the `level_retention_criteria` table consistent without requiring a schema change, while the UI only exposes the 3 retention-specific settings.

### E. PDF Export (`LevelRequirementsPDF.ts`)

Update the retention section to show "Same as Level Requirements" for KPI thresholds, plus the retention-specific settings (window, grace, action).

## Files Modified

- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — remove retention KPI rows, keep only policy rows
- `src/components/dashboard/settings/GraduationWizard.tsx` — simplify retention tab to 3 settings
- `src/hooks/useLevelProgress.ts` — read retention KPIs from promotion criteria
- `src/components/dashboard/settings/LevelRequirementsPDF.ts` — update retention section

## No Database Changes

The `level_retention_criteria` table stays as-is. We just stop exposing its KPI fields in the UI and stop reading them at runtime — using promotion criteria as the source of truth instead.

