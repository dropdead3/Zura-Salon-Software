

# Task Engine 2.0 — Build Plan

## Current State

The `tasks` table has: `id`, `user_id`, `title`, `description`, `is_completed`, `due_date`, `priority` (text: low/normal/high), `source`, `notes`, `recurrence_pattern`, `recurrence_parent_id`, `snoozed_until`, `estimated_revenue_impact_cents`, `expires_at`, `completed_at`, `created_at`, `updated_at`.

Task UI (`TaskItem`, `TasksCard`, `AddTaskDialog`, `EditTaskDialog`, `TaskDetailDrilldown`) already supports revenue impact badges and expiry countdowns. The Daily Briefing Engine sorts tasks by `estimated_revenue_impact_cents` then priority.

**What's missing**: opportunity linkage, priority scoring, task type classification, enforcement level, execution time, difficulty, decay logic, missed opportunity tracking, and the deterministic priority formula.

## Build Scope

### 1. Database Migration — New Task Columns

Add to `tasks` table:
- `opportunity_id` (uuid, nullable) — FK to `capital_funding_opportunities`
- `revenue_type` (text, nullable, default null) — `'generated'` or `'protected'`
- `priority_score` (integer, nullable, default null) — deterministic 0-100
- `execution_time_minutes` (integer, nullable, default null)
- `difficulty_score` (integer, nullable, default null) — 0-100
- `task_type` (text, nullable, default null) — `'growth'`, `'protection'`, `'acceleration'`, `'unlock'`
- `enforcement_level` (integer, nullable, default 1) — 1=soft, 2=moderate, 3=hard
- `decay_days` (integer, nullable, default null)
- `missed_revenue_cents` (integer, nullable, default null) — populated when expired
- `status` (text, default `'active'`) — `'created'`, `'active'`, `'in_progress'`, `'completed'`, `'expired'`, `'missed'`

### 2. Task Priority Calculator (`src/lib/task-priority-calculator.ts`)

Pure deterministic function following the same pattern as `seo-priority-calculator.ts`:

```text
priority_score = (
  revenue_impact_score × 0.40 +
  urgency_score       × 0.25 +
  ease_score           × 0.15 +
  confidence_score     × 0.10 +
  dependency_score     × 0.10
) × 100  → integer 0–100
```

Normalization:
- Revenue: $0→0, $5000/mo→100 (linear clamp)
- Urgency: 1d→100, 3d→80, 7d→50, 14+→20 (based on `expires_at` or `due_date`)
- Ease: 5min→100, 15→80, 30→60, 60+→40
- Confidence: passed through from opportunity (default 0.7 if no opportunity)
- Dependency: +10 if other tasks are blocked by this one (future; default 0)

### 3. Update `useTasks` Hook + Task Interface

Extend `Task` interface with all new fields. Update `createTask` and `updateTask` mutations to accept new fields. Add ordering by `priority_score` descending (when non-null) as primary sort.

### 4. Update Task UI Components

**TaskItem.tsx**: Show task type badge (Growth/Protection/Acceleration/Unlock), execution time estimate, and priority score dot instead of simple priority indicator.

**AddTaskDialog.tsx**: Add optional fields for task type, execution time, opportunity link, and revenue type. Keep the form simple — these are optional for manual tasks.

**EditTaskDialog.tsx**: Same new optional fields.

**TaskDetailDrilldown.tsx**: Show full task metadata: revenue impact, revenue type, opportunity link, priority score breakdown, enforcement level, and missed revenue (if expired).

**TasksCard.tsx**: Sort active tasks by `priority_score` descending (when available), then by existing priority. Add "Missed" section below Expired showing cumulative missed revenue.

### 5. Missed Opportunity Tracking

When a task expires (detected client-side in `useTasks` or `useDailyBriefingEngine`):
- If `is_completed = false` and `expires_at < now()` and `missed_revenue_cents` is null:
  - Set `status = 'expired'`, `missed_revenue_cents = estimated_revenue_impact_cents`
  - This is a one-time write on detection

**MissedOpportunityBanner** component: Summarizes weekly missed revenue. Placed in Daily Briefing blockers section.

### 6. Daily Briefing Engine Enhancement

Update `useDailyBriefingEngine.ts`:
- Sort `shouldDoTasks` by `priority_score` descending instead of raw `estimated_revenue_impact_cents`
- Include `missed_revenue_cents` aggregation in blockers
- Show enforcement warnings when tasks with `enforcement_level >= 2` are overdue

### 7. Capital Integration Gate

In `useZuraCapital` surfacing logic: if opportunity has linked tasks with `task_type = 'unlock'` that are incomplete, suppress the opportunity's "Fund Now" action and show "Complete prerequisite tasks first" message. This enforces the unlock gate.

## Files

| File | Action |
|---|---|
| Migration SQL | CREATE — add 10 columns to `tasks` |
| `src/lib/task-priority-calculator.ts` | CREATE — deterministic priority formula |
| `src/hooks/useTasks.ts` | UPDATE — extend interface + sort by priority_score |
| `src/components/dashboard/TaskItem.tsx` | UPDATE — task type badge, priority score, exec time |
| `src/components/dashboard/AddTaskDialog.tsx` | UPDATE — optional new fields |
| `src/components/dashboard/EditTaskDialog.tsx` | UPDATE — optional new fields |
| `src/components/dashboard/TaskDetailDrilldown.tsx` | UPDATE — full metadata display |
| `src/components/dashboard/TasksCard.tsx` | UPDATE — priority_score sort, missed section |
| `src/components/dashboard/MissedOpportunityBanner.tsx` | CREATE — weekly missed revenue summary |
| `src/hooks/useDailyBriefingEngine.ts` | UPDATE — priority_score sort, missed revenue |
| `src/components/dashboard/DailyBriefingPanel.tsx` | UPDATE — missed opportunity in blockers |

## Build Order

1. Database migration (10 new columns)
2. Create `task-priority-calculator.ts`
3. Update `useTasks` hook (interface + sort + missed detection)
4. Update `TaskItem` (type badge, priority score, exec time)
5. Update `AddTaskDialog` + `EditTaskDialog` (new fields)
6. Update `TaskDetailDrilldown` (full metadata)
7. Update `TasksCard` (priority sort, missed section)
8. Create `MissedOpportunityBanner`
9. Update Daily Briefing engine + panel
10. TypeScript build check

## Out of Scope (Phase 2)

- Task auto-generation from opportunities (POST /tasks/generate)
- Enforcement levels 2-3 (restrict lead pool, delay capital)
- Team accountability dashboards (completion rate, missed value per person)
- Backend endpoints (prioritized fetch, generate from opportunities)
- Capital unlock gate enforcement in `useZuraCapital`

