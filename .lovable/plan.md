

# Remaining Gaps and Enhancements — Levels & Commission System

## Critical: Multi-Tenancy Violation on `stylist_levels`

The `stylist_levels` table has **no `organization_id` column**. Every organization in the platform shares the same set of levels. This is the single most critical gap in the system — it breaks tenant isolation, a non-negotiable architectural rule.

All queries against `stylist_levels` (in `useStylistLevels`, `useResolveCommission`, `useSaveStylistLevels`, etc.) fetch globally with no org filter. The moment a second organization is onboarded, they will see and modify each other's levels.

**Fix:** Add `organization_id` to `stylist_levels`, backfill existing rows, update the unique constraint from `(slug)` to `(organization_id, slug)`, add RLS policies scoped to org membership, and update all hooks to filter by `orgId`.

---

## Gap 2: Commission Resolution Ignores Location Overrides

`useResolveCommission` resolves commission as: per-stylist override → level default → unassigned. It does **not** check `level_commission_overrides` (the per-location commission table we just created). The table exists in the DB but is dead code — payroll and commission cards will never use location-specific rates.

**Fix:** Extend the resolution chain to: per-stylist override → location commission override → level default → unassigned. Requires passing `locationId` into `resolveCommission()`.

---

## Gap 3: Commission Economics Tab Not Implemented

The approved plan for the Commission Affordability Calculator ("Economics" tab) has not been built. The tab does not exist in the current `TabsList`. This is the feature that answers "can I afford this commission rate?" — a key intelligence gap for operators.

**Fix:** Build `CommissionEconomicsTab.tsx` and `useCommissionEconomics.ts` per the approved plan.

---

## Gap 4: Criteria Override Resolution Not Wired into Scorecard

`useLevelCriteriaOverrides` and `resolveCriteriaValue` exist as hooks, but `useLevelProgress` (which powers the Scorecard and Graduation Tracker) does **not** call them. It reads criteria directly from `level_promotion_criteria` / `level_retention_criteria` with no location override resolution. Location-specific KPI thresholds are therefore ignored during evaluation.

**Fix:** Wire `resolveCriteriaValue` into `useLevelProgress` and `useTeamLevelProgress` so that when a stylist belongs to a specific location, their criteria targets reflect any location/group overrides.

---

## Gap 5: Location Groups Have No Management UI

The `location_groups` table exists and `useLocationGroups` hook is created, but there is no admin UI to create, rename, reorder, or assign locations to groups. The `LocationsSettingsContent` component was supposed to get a "Groups" section but it was not added.

**Fix:** Add a "Location Groups" management section to `LocationsSettingsContent` with CRUD operations and drag-and-drop location assignment.

---

## Enhancement 1: Audit Trail for Commission Rate Changes

When commission rates on `stylist_levels` are changed, there is no audit log. For an enterprise operator, not knowing who changed a commission rate from 45% to 50% (and when) is a compliance gap. The `level_promotions` table logs level movements, but commission rate edits are untracked.

**Fix:** Log commission rate changes to `platform_action_log` via `log_platform_action` RPC (already exists) when saving levels.

---

## Enhancement 2: Stylist-Facing Level Roadmap

Stylists can see their Scorecard (current progress), but there is no view that shows them the full progression ladder — "here's where you are, here's what the next level requires, here's what your commission would be." The PDF export exists for admins, but stylists have no self-service visibility into what they're working toward.

**Fix:** Add a "My Progression" card to the stylist dashboard that renders a simplified level ladder with their current position highlighted and next-level criteria.

---

## Proposed Implementation Order

| Priority | Item | Impact |
|----------|------|--------|
| 1 | Multi-tenancy fix (`organization_id` on `stylist_levels`) | Blocks safe multi-org deployment |
| 2 | Wire location commission overrides into `useResolveCommission` | Makes per-location rates functional |
| 3 | Wire criteria overrides into `useLevelProgress` | Makes per-location KPI targets functional |
| 4 | Commission Economics Tab | Key intelligence feature for operators |
| 5 | Location Groups management UI | Completes enterprise grouping UX |
| 6 | Audit trail for rate changes | Compliance |
| 7 | Stylist-facing progression roadmap | Engagement |

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Add `organization_id` to `stylist_levels`, backfill, update unique constraint + RLS |
| `src/hooks/useStylistLevels.ts` | Filter all queries by `orgId` |
| `src/hooks/useResolveCommission.ts` | Add `locationId` param, check `level_commission_overrides` |
| `src/hooks/useLevelProgress.ts` | Integrate `resolveCriteriaValue` for location-aware thresholds |
| `src/hooks/useTeamLevelProgress.ts` | Same location-aware override resolution |
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | **New** — Economics calculator |
| `src/hooks/useCommissionEconomics.ts` | **New** — Revenue-per-level fetcher + margin math |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Add Economics tab, pass orgId to save |
| `src/components/dashboard/settings/LocationsSettingsContent.tsx` | Add Location Groups CRUD UI |

**9 files. 1 migration.**

