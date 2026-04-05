

# Add Client Retention + New Clients Criteria & Surface Context Metrics

## Overview

Three workstreams: (1) Add **Client Retention Rate** and **New Client Count** as optional promotion/retention criteria, (2) surface **No-Show Rate** and **Utilization** as informational context on the Graduation Tracker, and (3) audit the GraduationWizard for bugs/gaps.

---

## Part 1: Add Retention Rate + New Clients as Criteria

### Database Migration

Add 6 columns to `level_promotion_criteria`:
- `retention_rate_enabled` boolean default false
- `retention_rate_threshold` numeric default 0
- `retention_rate_weight` integer default 0
- `new_clients_enabled` boolean default false
- `new_clients_threshold` numeric default 0 (monthly count)
- `new_clients_weight` integer default 0

Add 4 columns to `level_retention_criteria`:
- `retention_rate_enabled` boolean default false
- `retention_rate_minimum` numeric default 0
- `new_clients_enabled` boolean default false
- `new_clients_minimum` numeric default 0

### Hook Updates

| File | Change |
|------|--------|
| `useLevelPromotionCriteria.ts` | Add 6 new fields to `LevelPromotionCriteria` interface |
| `useLevelRetentionCriteria.ts` | Add 4 new fields to `LevelRetentionCriteria` interface |

### GraduationWizard Updates

| Change | Detail |
|--------|--------|
| `FormState` interface | Add `retention_rate_enabled`, `retention_rate_threshold`, `retention_rate_weight`, `new_clients_enabled`, `new_clients_threshold`, `new_clients_weight` |
| `RetentionFormState` | Add `retention_rate_enabled`, `retention_rate_minimum`, `new_clients_enabled`, `new_clients_minimum` |
| `CRITERIA` array | Add two entries: `{ key: 'retention_rate', label: 'Client Retention', icon: Users, unit: '%' }` and `{ key: 'new_clients', label: 'New Clients', icon: UserPlus, unit: '/mo' }` |
| `RETENTION_CRITERIA` array | Same two new entries with `minimumKey` variants |
| `INITIAL_STATE` / `INITIAL_RETENTION_STATE` | Add defaults for new fields |
| `getZuraDefaults()` | Add recommended values (e.g. retention 60-80%, new clients 5-15/mo by level) |
| Load/save mapping | Map new DB columns in both directions |

### Progress Evaluation (`useTeamLevelProgress.ts`)

- Fetch `retention_rate` and `new_clients` from `phorest_performance_metrics` alongside existing data
- `computeMetrics()` returns two new values: `retentionRate` (avg over window) and `newClientsMonthly` (sum, normalized to 30d)
- Add promotion progress entries for both when enabled
- Add retention failure checks for both when enabled

### Criteria Comparison Table

- Add two new rows in both Promotion and Retention sections: "Client Retention" and "New Clients"

---

## Part 2: Surface No-Show + Utilization on Graduation Tracker

These are **informational context only** — not hard criteria. They appear as supplementary badges on each stylist's card in the Graduation Tracker.

| Metric | Source | Display |
|--------|--------|---------|
| No-Show Rate | `phorest_appointments` where `status = 'no_show'` / total completed+no_show | Small badge: `"3% no-show"` |
| Utilization | Already computed in operations analytics; fetch from `appointments` (booked hours / available hours) | Small badge: `"78% utilized"` — or omit if data unavailable |

### Implementation

- In `useTeamLevelProgress.ts`, add a lightweight query for no-show counts per user (already fetching appointments)
- Calculate no-show rate from existing `allApptData` by counting `status === 'no_show'` — requires adding `status` to the appointment select
- Add `noShowRate` and optionally `utilization` to `TeamMemberProgress` interface
- In `GraduationTracker.tsx`, render as muted info badges on each stylist row (not in the criteria progress section)

---

## Part 3: GraduationWizard Audit Findings

| # | Issue | Fix |
|---|-------|-----|
| 1 | **Zura defaults don't account for new criteria** | Add retention_rate and new_clients to `getZuraDefaults()` with level-appropriate values |
| 2 | **Weight normalization doesn't include new criteria** | Update weight sum calculation (Step 2) to include `retention_rate_weight` + `new_clients_weight` |
| 3 | **"Reset to Defaults" only resets original 4 criteria** | Extend reset logic to cover all 6 criteria |
| 4 | **Tenure criterion has no weight** but other criteria do | Tenure is pass/fail (correct), but the UI doesn't clarify this — add a small "(pass/fail)" label next to Tenure |

---

## File Summary

| File | Action |
|------|--------|
| Migration SQL | **Create** — Add columns to both criteria tables |
| `useLevelPromotionCriteria.ts` | **Modify** — Extend interface |
| `useLevelRetentionCriteria.ts` | **Modify** — Extend interface |
| `GraduationWizard.tsx` | **Modify** — Add criteria configs, form state, defaults, save/load mapping, weight normalization |
| `useTeamLevelProgress.ts` | **Modify** — Fetch metrics data, evaluate new criteria, add no-show rate |
| `StylistLevelsEditor.tsx` | **Modify** — Add rows to CriteriaComparisonTable |
| `GraduationTracker.tsx` | **Modify** — Render no-show/utilization info badges |

**1 migration, 6 modified files, 0 new files.**

