

# Add Schedule Utilization as a Graduation Criterion

## Business Logic

Before a stylist raises prices (levels up), they must prove demand at their current rate. An empty schedule at current prices means raising prices will make things worse. Utilization is the demand signal.

## Data Strategy

Two available data sources:
- **`staff_shifts`** — has `user_id`, `shift_date`, `start_time`, `end_time` (currently empty, but will populate as scheduling matures)
- **`appointments`** — has `staff_user_id`, `start_time`, `end_time`, `duration_minutes`

**Calculation**: When shift data exists for a stylist, compute `booked_hours / shift_hours * 100`. When it doesn't, fall back to **booking density** — average booked hours per working day (estimated from appointment days with activity). This gives a meaningful demand proxy even without shift data.

The metric is expressed as a percentage (0-100%) for utilization, making it intuitive for salon owners.

---

## Database Migration

Add 3 columns to `level_promotion_criteria`:
- `utilization_enabled` boolean default false
- `utilization_threshold` numeric default 0 (target %)
- `utilization_weight` integer default 0

Add 2 columns to `level_retention_criteria`:
- `utilization_enabled` boolean default false
- `utilization_minimum` numeric default 0

## File Changes

### 1. Migration SQL — Add utilization columns to both criteria tables

### 2. `useLevelPromotionCriteria.ts` — Add 3 fields to interface

### 3. `useLevelRetentionCriteria.ts` — Add 2 fields to interface

### 4. `GraduationWizard.tsx`
- Add `utilization` entry to `CRITERIA` array: `{ key: 'utilization', label: 'Schedule Utilization', icon: CalendarClock, unit: '%' }`
- Add to `RETENTION_CRITERIA` array
- Extend `FormState` with `utilization_enabled`, `utilization_threshold`, `utilization_weight`
- Extend `RetentionFormState` with `utilization_enabled`, `utilization_minimum`
- Update `INITIAL_STATE`, `INITIAL_RETENTION_STATE`, `getZuraDefaults()` (e.g. 70-85% by level)
- Update load/save mapping, weight normalization, reset logic

### 5. `useTeamLevelProgress.ts`
- Add a batch query for `staff_shifts` within the evaluation window for all team members
- In `computeMetrics()`: calculate utilization per stylist
  - If shift data exists: `sum(booked_minutes) / sum(shift_minutes) * 100`
  - Fallback: estimate from appointment density (booked hours per active day, capped at a reasonable work-day assumption like 8h)
- Add promotion progress entry for utilization when enabled
- Add retention failure check for utilization when enabled

### 6. `StylistLevelsEditor.tsx` — Add "Schedule Utilization" row to CriteriaComparisonTable (both sections)

---

## Zura Default Recommendations

| Level | Utilization Target | Weight |
|-------|-------------------|--------|
| Level 1 → 2 | 65% | 10 |
| Level 2 → 3 | 75% | 10 |
| Level 3 → 4 | 80% | 10 |
| Level 4+ | 85% | 10 |

Lower weight than revenue (10 vs 40) because utilization is a qualifying gate, not the primary driver. But it's critical — you can't skip it.

## File Summary

| File | Action |
|------|--------|
| Migration SQL | **Create** — Add columns to both criteria tables |
| `useLevelPromotionCriteria.ts` | **Modify** — Extend interface |
| `useLevelRetentionCriteria.ts` | **Modify** — Extend interface |
| `GraduationWizard.tsx` | **Modify** — Add utilization criterion config, form state, defaults, save/load |
| `useTeamLevelProgress.ts` | **Modify** — Fetch shifts, compute utilization, evaluate criterion |
| `StylistLevelsEditor.tsx` | **Modify** — Add row to comparison table |

**1 migration, 5 modified files, 0 new files.**

