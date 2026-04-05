

# Add Revenue Per Hour as a Graduation Criterion

## Why Only Revenue Per Hour (Not Request Rate)

**Request Rate** (% of appointments where the client specifically requested the stylist) requires a data field that doesn't exist in the current schema — `phorest_appointments` has no `is_requested` column, and Phorest's export doesn't reliably provide it. Adding it would require either manual tracking or a POS integration enhancement — not something we can wire up today.

**Revenue Per Hour** is immediately calculable: `sum(total_price) / sum(duration_minutes) * 60` from existing appointment data. It's the economic efficiency signal — a stylist earning $120/hr at 80% utilization is a stronger promotion candidate than one earning $60/hr at 95% utilization.

Together with the utilization criterion just added, this creates the complete demand picture:
- **Utilization** = "Are they busy enough?"
- **Revenue Per Hour** = "Are they generating enough value per hour worked?"

Both must be strong before raising prices.

---

## Database Migration

Add 3 columns to `level_promotion_criteria`:
- `rev_per_hour_enabled` boolean default false
- `rev_per_hour_threshold` numeric default 0
- `rev_per_hour_weight` integer default 0

Add 2 columns to `level_retention_criteria`:
- `rev_per_hour_enabled` boolean default false
- `rev_per_hour_minimum` numeric default 0

## File Changes

### 1. Migration SQL — Add columns to both criteria tables

### 2. `useLevelPromotionCriteria.ts` — Add 3 fields to interface

### 3. `useLevelRetentionCriteria.ts` — Add 2 fields to interface

### 4. `GraduationWizard.tsx`
- Add `rev_per_hour` entry to `CRITERIA` array: `{ key: 'rev_per_hour', label: 'Revenue Per Hour', icon: DollarSign, unit: '$/hr' }`
- Add to `RETENTION_CRITERIA` array
- Extend `FormState` with `rev_per_hour_enabled`, `rev_per_hour_threshold`, `rev_per_hour_weight`
- Extend `RetentionFormState` with `rev_per_hour_enabled`, `rev_per_hour_minimum`
- Update `INITIAL_STATE`, `INITIAL_RETENTION_STATE`, `getZuraDefaults()`
- Update load/save mapping, weight normalization, reset logic

### 5. `useTeamLevelProgress.ts`
- In `computeMetrics()`: calculate `revPerHour = sum(total_price) / sum(duration_minutes) * 60` from completed appointments
- Add promotion progress entry for rev_per_hour when enabled
- Add retention failure check for rev_per_hour when enabled

### 6. `StylistLevelsEditor.tsx` — Add "Revenue Per Hour" row to CriteriaComparisonTable (both sections)

### 7. `kpiTemplates.ts` — Add Revenue Per Hour template for KPI architecture consistency

---

## Zura Default Recommendations

These are intentionally conservative — salon owners can adjust up:

| Level | Rev/Hr Target | Weight |
|-------|--------------|--------|
| Level 1 → 2 | $40/hr | 15 |
| Level 2 → 3 | $55/hr | 15 |
| Level 3 → 4 | $75/hr | 15 |
| Level 4+ | $95/hr | 15 |

Higher weight than utilization (15 vs 10) because revenue per hour directly measures economic value — the core signal for whether a price increase is justified.

## Future: Request Rate

When `is_requested` data becomes available (via Phorest integration or manual tracking), Request Rate can be added as another criterion following the same pattern. For now, it's not trackable.

## File Summary

| File | Action |
|------|--------|
| Migration SQL | **Create** — Add columns to both criteria tables |
| `useLevelPromotionCriteria.ts` | **Modify** — Extend interface |
| `useLevelRetentionCriteria.ts` | **Modify** — Extend interface |
| `GraduationWizard.tsx` | **Modify** — Add rev_per_hour criterion config, form state, defaults, save/load |
| `useTeamLevelProgress.ts` | **Modify** — Compute rev/hr, evaluate criterion |
| `StylistLevelsEditor.tsx` | **Modify** — Add row to comparison table |
| `kpiTemplates.ts` | **Modify** — Add Revenue Per Hour template |

**1 migration, 6 modified files, 0 new files.**

