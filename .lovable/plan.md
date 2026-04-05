
# Fix 5 Graduation System Gaps

## Current State Assessment

After code review, some gaps are partially addressed already:
- **Promotion History**: PromotionHistorySection exists inline per-member, but there's no dedicated org-wide history tab
- **Demotion Workflow**: DemoteLevelButton exists for `below_standard` members — functional but could surface for all at-risk members
- **Retention Rate**: Still uses `rebookingPct` as proxy (line 203-204 of useLevelProgress.ts, line 204 of useTeamLevelProgress.ts)
- **Time at Level**: Not shown anywhere
- **Hook Sync**: `useLevelProgress.ts` (stylist-facing) is missing retention_rate, new_clients, utilization, rev_per_hour — only has the original 4 criteria

---

## Gap 1: True Client Retention Rate Calculation

**Problem**: `retentionRate = rebookingPct` is a placeholder. Rebooking rate measures checkout behavior, not whether clients actually return.

**Solution**: Query distinct client IDs from appointments in two consecutive windows (prior period vs current period) and calculate `returning_clients / prior_period_clients * 100`.

**Files**:
- `useTeamLevelProgress.ts` — Add a batch query for client IDs by stylist across two consecutive windows. Replace `retentionRate = rebookingPct` with true retention calc.
- `useLevelProgress.ts` — Same calculation for the stylist-facing hook.

**Calculation**:
```
prior_window: appointments where date in [evalStart - evalDays, evalStart]
current_window: appointments where date in [evalStart, evalEnd]
returning = count of distinct client_ids that appear in BOTH windows
retention_rate = (returning / distinct_clients_in_prior) * 100
```

Requires adding `client_id` to the appointment query select (already exists on the `appointments` table).

---

## Gap 2: Org-Wide Promotion History Tab

**Problem**: History is only visible per-member in a collapsible. No org-wide timeline view.

**Solution**: Add a "History" tab to GraduationTracker showing all promotions/demotions in reverse chronological order, with filters.

**Files**:
- `GraduationTracker.tsx` — Add a `<TabsTrigger value="history">` and `<TabsContent>` rendering `promotions` data as a timeline. Show: date, member name, from/to level, direction (promotion/demotion), approved by.

---

## Gap 3: Time at Current Level

**Problem**: Tracker shows hire date but not how long someone has been at their current level — the more relevant metric.

**Solution**: Query the most recent `level_promotions` record per user to get `promoted_at`, then compute days since. If no record exists, fall back to hire date.

**Files**:
- `useTeamLevelProgress.ts` — Add batch query for most recent `level_promotions` per user. Add `timeAtLevelDays` and `levelSince` to `TeamMemberProgress` interface.
- `GraduationTracker.tsx` — Display "X days at level" alongside or instead of hire date in the member row.
- `useLevelProgress.ts` — Add same field for stylist-facing view.

---

## Gap 4: Demotion Workflow Polish

**Problem**: Demote button only appears for `below_standard` status. At-risk members with `demotion_eligible` action type should also see it after grace period consideration.

**Solution**: Show DemoteLevelButton for both `below_standard` AND `at_risk` members when their retention action type is `demotion_eligible`. Add a confirmation note field to capture reason for demotion.

**Files**:
- `GraduationTracker.tsx` — Adjust DemoteLevelButton visibility condition. Add optional notes textarea in the confirmation dialog.
- `useDemoteLevel.ts` — Accept optional `notes` field and store in `level_promotions`.

**Migration**: Add `notes` column to `level_promotions` table.

---

## Gap 5: Sync Stylist-Facing Hook (useLevelProgress.ts)

**Problem**: The stylist-facing `useLevelProgress` hook only evaluates 4 original criteria (revenue, retail, rebooking, avg_ticket) plus tenure. Missing: retention_rate, new_clients, utilization, rev_per_hour — and their retention counterparts.

**Solution**: Mirror the evaluation logic from `useTeamLevelProgress.ts` into `useLevelProgress.ts`.

**Files**:
- `useLevelProgress.ts`:
  - Add queries for `staff_shifts` and include `is_new_client`, `duration_minutes`, `client_id` in appointment select
  - Add promotion criteria evaluation for: retention_rate, new_clients, utilization, rev_per_hour
  - Add retention failure checks for: retention_rate, new_clients, utilization, rev_per_hour
  - Use true retention rate calculation (from Gap 1)

---

## Database Migration

Single migration adding:
- `notes TEXT` column to `level_promotions`

---

## File Summary

| File | Action | Gaps |
|------|--------|------|
| Migration SQL | **Create** — Add `notes` to `level_promotions` | 4 |
| `useTeamLevelProgress.ts` | **Modify** — True retention rate, time-at-level query | 1, 3 |
| `useLevelProgress.ts` | **Modify** — Add all 8 criteria + true retention + time-at-level | 1, 3, 5 |
| `GraduationTracker.tsx` | **Modify** — History tab, time-at-level display, demote button scope | 2, 3, 4 |
| `useDemoteLevel.ts` | **Modify** — Accept notes param | 4 |
| `usePromotionHistory.ts` | **Modify** — Include notes in query | 4 |

**1 migration, 5 modified files, 0 new files.**
