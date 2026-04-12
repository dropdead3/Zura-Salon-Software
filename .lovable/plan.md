

# Operator Mode — Command Center Evolution

## Current Architecture

The "Command Center" is not a standalone page. It's the DashboardHome itself, composed of:
- `DailyBriefingPanel` (top, role-aware — Today's Focus, You Should Do, Zura Already Did, Blockers, Opportunity Remaining, Active Growth Moves)
- `CommandCenterControlRow` (analytics filter bar + insights/announcements drawers)
- Pinned analytics cards (user-customizable grid)
- Section-based layout (tasks, quick actions, announcements, etc.)

`CommandCenterAnalytics.tsx` (611 lines) is orphaned — never imported. It duplicates DailyBriefingSection inline and renders the same pinned cards. This is dead code.

The DailyBriefingPanel already covers 4 of the 6 spec sections (Focus, Tasks, Blockers, Active Growth Moves). What's missing are the new "Operator Mode" surfaces.

## What's Missing vs Spec

| Spec Section | Current State | Action |
|---|---|---|
| Top Lever (singular highest ROI) | Partial — briefing has "focus" but no standalone prominent component | BUILD — new component above briefing |
| Money Left on the Table | Not implemented | BUILD — aggregates missed revenue signals |
| Capital Opportunities inline | Capital is a separate pinned card (`ZuraCapitalCard`) | REFACTOR — integrate into briefing flow |
| Performance Snapshot (compressed) | Scattered across pinned cards | BUILD — 4-KPI strip |
| Team contribution visibility | Not implemented | BUILD — mini leaderboard |
| Insight → Task linking | Not implemented visually | BUILD — connection UI |
| Dead `CommandCenterAnalytics.tsx` | 611 lines of unused code | DELETE |

## Build Scope

### 1. Delete Orphaned `CommandCenterAnalytics.tsx`
611 lines of dead code. Safe to remove — no imports reference it.

### 2. `OperatorTopLever` Component
Prominent card above the DailyBriefingPanel. Uses `useZuraCapital().topOpportunity` to display the single highest-ROI action across the org. Shows: title, location, revenue lift (BlurredAmount), break-even months, and a primary CTA ("Activate Growth" linking to capital detail). Falls back to the briefing engine's `focus` if no capital opportunity exists. Only renders for leadership roles.

### 3. `MoneyLeftOnTable` Component
Aggregates lost revenue from multiple signals:
- Expired tasks with `missed_revenue_cents` (from Task Engine 2.0)
- Capital opportunities not acted on (eligible but status still `detected`)
- Overdue tasks with `estimated_revenue_impact_cents`

Displays as a compact list: signal label + lost cents, with a total. Amber styling. Only shows when total > 0.

### 4. `OperatorPerformanceStrip` Component
4-KPI horizontal strip (Revenue trend, Utilization, Rebooking, Retail attach). Uses existing hooks (`useSalesMetrics`, `useStaffUtilization`, `useRetailAttachmentRate`). Compact tiles with trend arrows. Replaces the need to pin individual analytics cards for quick pulse.

### 5. `TeamGrowthContribution` Component
Mini leaderboard showing top 3-5 team members by Zura-attributed revenue this month. Queries `tasks` where `source IN ('zura', 'seo_engine')` and `is_completed = true`, grouped by `user_id`, summing `estimated_revenue_impact_cents`. Compact list with avatar, name, attributed revenue.

### 6. Wire New Components into DashboardHome
New section order for leadership: `operator_top_lever` → `daily_briefing` → `money_left` → `operator_performance` → `team_growth` → existing sections. Add to `sectionComponents` map and default layout.

### 7. Integrate Capital Inline in Briefing
Add a "Capital Available" row to the Active Growth Moves section of DailyBriefingPanel when the top opportunity has `stripeOfferAvailable`. Shows funding amount + CTA. This removes the need for a separate pinned ZuraCapitalCard for leadership.

---

## Files

| File | Action |
|---|---|
| `src/components/dashboard/CommandCenterAnalytics.tsx` | DELETE (orphaned) |
| `src/components/dashboard/operator/OperatorTopLever.tsx` | CREATE |
| `src/components/dashboard/operator/MoneyLeftOnTable.tsx` | CREATE |
| `src/components/dashboard/operator/OperatorPerformanceStrip.tsx` | CREATE |
| `src/components/dashboard/operator/TeamGrowthContribution.tsx` | CREATE |
| `src/pages/dashboard/DashboardHome.tsx` | UPDATE — add new sections |
| `src/hooks/useDashboardLayout.ts` | UPDATE — add new section IDs to defaults |
| `src/components/dashboard/DailyBriefingPanel.tsx` | UPDATE — inline capital CTA in Active Growth Moves |

## Build Order

1. Delete `CommandCenterAnalytics.tsx`
2. Create `OperatorTopLever`
3. Create `MoneyLeftOnTable`
4. Create `OperatorPerformanceStrip`
5. Create `TeamGrowthContribution`
6. Update `DailyBriefingPanel` with inline capital
7. Wire all into `DashboardHome` + layout defaults
8. TypeScript build check

## Technical Notes

- All monetary values wrapped in `BlurredAmount`
- All components use `tokens` from design system
- Leadership-only gating via role checks (not VisibilityGate — these are structural)
- `TeamGrowthContribution` needs a new query grouping tasks by user_id — will use `supabase.rpc()` or client-side aggregation from existing task data
- No new database tables or migrations required — all data sources already exist

