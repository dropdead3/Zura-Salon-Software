

# System Adoption and Behavior Design — Phase 1 Build Plan

## What Exists Today

The DashboardHome is a layout-driven page with role-aware sections: quick stats, quick actions, tasks, announcements, pinned analytics cards, client engine (75-day challenge), push list, level progress, SEO tasks, and widgets. The Command Center (⌘K) is a search/navigation surface. Tasks are generic to-do items with no revenue linkage. A leaderboard exists with weights, history, achievements, and trend tracking. Onboarding has a setup wizard for dashboard layout.

## What's Missing

1. **No Daily Briefing** — Users land on a generic dashboard with scattered widgets. No single "here's what matters today" summary.
2. **No revenue linkage on tasks** — Tasks have title/priority/due date but no `estimated_revenue_impact_cents` or opportunity decay.
3. **No "Zura Already Did" visibility** — Automated actions (review requests, GBP posts, SEO tasks) are not surfaced as completed-for-you.
4. **No "Money Being Left" surface** — Lost opportunity visibility doesn't exist as a dedicated section.
5. **No task expiry** — Tasks don't expire based on opportunity decay windows.
6. **No Zura Actions attribution** — No tracking of "revenue generated from Zura-recommended actions."

## Build Scope — Phase 1 (Daily Operating Loop)

### 1. Daily Briefing Card (`DailyBriefingCard.tsx`)

A new dashboard section that replaces the current greeting header with a structured daily operating briefing. Renders at the top of DashboardHome for leadership roles.

Sections:
- **Today's Focus** — Top lever from AI insights or highest-priority opportunity (pulled from existing `useQuickStats` + `useZuraCapital`)
- **Zura Already Did** — Count of automated actions completed today (SEO tasks auto-completed, review requests sent, GBP posts published). Query `seo_tasks` where `completed_at = today` and `assigned_to = 'system'`, plus `capital_surface_events` for today.
- **You Should Do** — Top 3 uncompleted tasks sorted by revenue impact (requires new field) or priority
- **Blocked** — Items from inventory alerts or capacity constraints (query existing `inventory_alerts` and capacity data)

### 2. Task Revenue Impact Field

Add `estimated_revenue_impact_cents` (integer, nullable, default null) and `expires_at` (timestamptz, nullable) columns to the `tasks` table via migration. Update `useTasks` hook interface, create/update mutations, and `TaskItem` display to show revenue impact when present.

### 3. Revenue Impact Display on Tasks

Update `TaskItem.tsx` to show a small revenue badge when `estimated_revenue_impact_cents` is set: "~$800/mo" in green text. Update `AddTaskDialog` and `EditTaskDialog` to include an optional revenue impact field.

### 4. Zura Actions Attribution Tracker

New hook `useZuraActionsAttribution` that queries completed tasks where `source = 'zura'` or `source = 'seo_engine'` and sums `estimated_revenue_impact_cents` for the current month. Display as a small card on the dashboard: "You generated $X from Zura actions this month."

### 5. Command Center "Top Lever" Enhancement

Add a "Top Lever" section to the Command Center empty-state view (the greeting screen in ⌘K). This surfaces the single highest-impact action from the daily briefing data — reusing the same query logic.

### 6. Task Expiry System

Tasks with `expires_at` set show a countdown badge ("Expires in 2d"). Expired tasks are visually dimmed and sorted to a separate "Expired" group in `TasksCard`. No auto-deletion — just visual treatment and a "This opportunity has decayed" label.

---

## Database Migration

```sql
ALTER TABLE tasks 
  ADD COLUMN estimated_revenue_impact_cents integer DEFAULT NULL,
  ADD COLUMN expires_at timestamptz DEFAULT NULL;
```

## Files Created

| File | Purpose |
|---|---|
| `src/components/dashboard/DailyBriefingCard.tsx` | Daily Briefing section for DashboardHome |
| `src/hooks/useZuraActionsAttribution.ts` | Monthly Zura-attributed revenue query |
| `src/hooks/useDailyBriefing.ts` | Aggregates briefing data (focus, auto-actions, blockers) |

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useTasks.ts` | Add `estimated_revenue_impact_cents` and `expires_at` to Task interface and mutations |
| `src/components/dashboard/TaskItem.tsx` | Show revenue impact badge and expiry countdown |
| `src/components/dashboard/AddTaskDialog.tsx` | Optional revenue impact field |
| `src/components/dashboard/EditTaskDialog.tsx` | Optional revenue impact field |
| `src/components/dashboard/TasksCard.tsx` | Add "Expired" task group |
| `src/pages/dashboard/DashboardHome.tsx` | Add `daily_briefing` section to layout, add `zura_attribution` section |
| `src/components/dashboard/CommandCenterAnalytics.tsx` | Add "Top Lever" to empty state |

## Out of Scope (Future Phases)

- **Soft/Hard Enforcement rules** (restrict lead pool, delay capital) — Phase 2
- **Team performance leaderboard with Zura contribution** — Phase 2 (leaderboard infra exists, needs attribution column)
- **Guided first-experience onboarding** (auto-analyze → assign first tasks) — Phase 2
- **Trust layer** (actual vs predicted tracking with variance explanations) — Phase 2 (partial exists in capital forecast tracking)
- **Gamification** (revenue-from-Zura ranking) — Phase 2
- **Task auto-generation from opportunities** — Phase 2

## Build Order

1. Database migration (add columns to tasks)
2. Update `useTasks` hook with new fields
3. Update `TaskItem` with revenue badge + expiry
4. Update `AddTaskDialog` + `EditTaskDialog` with revenue impact field
5. Update `TasksCard` with expired group
6. Build `useDailyBriefing` hook
7. Build `DailyBriefingCard` component
8. Build `useZuraActionsAttribution` hook
9. Wire into `DashboardHome` layout
10. Add Top Lever to Command Center empty state
11. TypeScript build check

