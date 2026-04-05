

# Fix 5 Graduation System Gaps

## Current State Assessment

After code review, some gaps are partially addressed already:
- **Promotion History**: PromotionHistorySection exists inline per-member, but there's no dedicated org-wide history tab
- **Demotion Workflow**: DemoteLevelButton exists for `below_standard` members — functional but could surface for all at-risk members
- **Retention Rate**: Still uses `rebookingPct` as proxy (line 204 of useTeamLevelProgress.ts)
- **Time at Level**: Not shown anywhere
- **Hook Sync**: `useLevelProgress.ts` (stylist-facing) is missing retention_rate, new_clients, utilization, rev_per_hour — only has the original 4 criteria

---

## Gap 1: True Client Retention Rate Calculation

**Problem**: `retentionRate = rebookingPct` is a placeholder. Rebooking rate measures checkout behavior, not whether clients actually return.

**Solution**: Query distinct client IDs from appointments in two consecutive windows (prior period vs current period) and calculate `returning_clients / prior_period_clients * 100`.

**Files**:
- `useTeamLevelProgress.ts` — Add `client_id` to appointment select. Replace `retentionRate = rebookingPct` with true retention calculation comparing unique clients across two consecutive windows.
- `useLevelProgress.ts` — Same calculation for the stylist-facing hook.

```text
prior_window:   [evalStart - evalDays, evalStart]
current_window: [evalStart, evalEnd]
returning = distinct client_ids in BOTH windows
retention_rate = (returning / distinct_clients_in_prior) * 100
```

---

## Gap 2: Org-Wide Promotion History Tab

**Problem**: History is only visible per-member in a collapsible. No org-wide timeline view.

**Solution**: Add a "History" tab to GraduationTracker showing all promotions/demotions in reverse chronological order. Show: date, member name, from/to level, direction (promotion/demotion), approved by.

**Files**:
- `GraduationTracker.tsx` — Add `<TabsTrigger value="history">` and `<TabsContent>` rendering `promotions` data as a timeline list.

---

## Gap 3: Time at Current Level

**Problem**: Tracker shows hire date but not how long someone has been at their current level.

**Solution**: Query the most recent `level_promotions` record per user to get `promoted_at`, then compute days since. Fall back to hire date if no record.

**Files**:
- `useTeamLevelProgress.ts` — Add batch query for most recent `level_promotions` per user. Add `timeAtLevelDays` and `levelSince` to `TeamMemberProgress`.
- `GraduationTracker.tsx` — Display "Xd at level" in the member row.
- `useLevelProgress.ts` — Add same field for stylist-facing view.

---

## Gap 4: Demotion Workflow Polish

**Problem**: Demote button only appears for `below_standard`. At-risk members with `demotion_eligible` action type should also see it.

**Solution**: Show DemoteLevelButton for both `below_standard` AND `at_risk` with `demotion_eligible` action. Add notes textarea in confirmation dialog. Add `notes` column to `level_promotions`.

**Files**:
- Migration SQL — Add `notes TEXT` to `level_promotions`
- `GraduationTracker.tsx` — Adjust DemoteLevelButton visibility, add notes field
- `useDemoteLevel.ts` — Accept optional `notes` param
- `usePromotionHistory.ts` — Include `notes` in select/interface

---

## Gap 5: Sync Stylist-Facing Hook

**Problem**: `useLevelProgress.ts` only evaluates 4 original criteria (revenue, retail, rebooking, avg_ticket) plus tenure. Missing: retention_rate, new_clients, utilization, rev_per_hour — and their retention counterparts.

**Solution**: Mirror the full evaluation logic from `useTeamLevelProgress.ts`.

**Files**:
- `useLevelProgress.ts`:
  - Add queries for `staff_shifts`
  - Add `is_new_client`, `duration_minutes`, `client_id` to appointment select
  - Add promotion + retention evaluation for all 8 criteria
  - Use true retention rate calculation from Gap 1

---

## Database Migration

Single migration: `ALTER TABLE public.level_promotions ADD COLUMN IF NOT EXISTS notes TEXT;`

---

## File Summary

| File | Action | Gaps |
|------|--------|------|
| Migration SQL | **Create** — Add `notes` to `level_promotions` | 4 |
| `useTeamLevelProgress.ts` | **Modify** — True retention rate, time-at-level query | 1, 3 |
| `useLevelProgress.ts` | **Modify** — Add all 8 criteria + true retention + time-at-level | 1, 3, 5 |
| `GraduationTracker.tsx` | **Modify** — History tab, time-at-level display, demote button scope, notes field | 2, 3, 4 |
| `useDemoteLevel.ts` | **Modify** — Accept notes param | 4 |
| `usePromotionHistory.ts` | **Modify** — Include notes in interface | 4 |

**1 migration, 5 modified files, 0 new files.**

