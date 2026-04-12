

# Daily Briefing — Full Build Plan

## Gap Analysis: Current vs Spec

| Spec Section | Current State | Status |
|---|---|---|
| Today's Focus (singular top opportunity) | Shows top 3 tasks as "You Should Do" | Missing — no capital/opportunity integration |
| Zura Already Did (automated actions) | Shows "Completed Today" count only | Missing — no SEO/automation query |
| You Should Do (2-4 revenue-linked tasks) | Partially exists but not tied to focus | Needs rework |
| Blockers | Not implemented | Missing |
| Opportunity Remaining | Shows "Revenue at Stake" loosely | Missing — no predicted vs captured calc |
| Active Growth Moves | Not implemented | Missing |
| Role-aware variants | Leadership-only gate | Missing stylist/manager variants |
| Placement in Command Center | Only on DashboardHome | Missing from ⌘K |
| Empty/missed state messaging | Not implemented | Missing |

The current implementation is a lightweight card. The spec requires a full panel with 6 structured sections powered by Capital, SEO, tasks, and operational data.

---

## Build Scope

### 1. New Hook: `useDailyBriefingEngine`

Replaces `useDailyBriefing` (which is pure task computation). The new hook composes data from multiple systems:

- **Today's Focus**: Uses `useZuraCapital().topOpportunity` — the highest `surfacePriority` eligible opportunity. Falls back to highest-impact task if no capital opportunity exists.
- **Zura Already Did**: New query — SEO tasks completed today where `assigned_to = 'system'` (automated). Plus `capital_surface_events` for today.
- **You Should Do**: Filters tasks by: tied to focus opportunity (via `source`/`service_id`/`location_id`), then highest `estimated_revenue_impact_cents`, capped at 2-4.
- **Blockers**: Query `inventory_alerts` (if table exists) + check capacity data for fully-booked signals.
- **Opportunity Remaining**: `predicted_total - captured_to_date` from capital opportunities or SEO revenue predictions.
- **Active Growth Moves**: Active capital projects + active SEO campaigns.
- **Role adaptation**: Accept `roleContext` param. Owner = org-wide. Manager = location-scoped. Stylist = personal tasks only, no capital.

### 2. Rewrite `DailyBriefingCard` → `DailyBriefingPanel`

Full component with 6 stacked sections following the spec hierarchy:

**A. Today's Focus** — Single directive. Shows opportunity title, location, revenue lift, one-line context sentence. Uses `tokens.card.title` for the focus label, `BlurredAmount` for revenue.

**B. Zura Already Did** — 2-5 automated action summaries (e.g., "Sent 5 review requests", "Updated extension page metadata"). Small checkmark icons, trust-building.

**C. You Should Do** — 2-4 tasks with revenue impact badges. Each task: title, `~$800/mo` badge, one-line "why". Checkbox to complete inline.

**D. Blockers** — Conditional. Only renders if real blockers exist. Amber styling, tied to lost revenue.

**E. Opportunity Remaining** — Shows `+$X,XXX this month` with a subtle progress indicator (captured vs predicted).

**F. Active Growth Moves** — Active campaigns and funded projects, 2-3 max, status badge.

**Empty state**: "You're on track today — no critical actions needed."

**Missed actions state**: When tasks have been ignored past due, show "$X,XXX opportunity at risk" in amber.

### 3. Role-Aware Variants

The panel renders different data based on role:
- **Owner/Admin**: Org-wide focus from capital + SEO, strategic tasks
- **Manager**: Location-filtered focus, team + operations tasks
- **Stylist**: Personal revenue focus, client-action tasks only, no capital section

### 4. Wire to Command Center (⌘K)

Add `DailyBriefingPanel` as the first section in `CommandCenterAnalytics` — above all pinned cards. Not pinnable, always visible for leadership. Uses same hook, compact layout.

### 5. Task Completion Micro-interaction

When a briefing task is completed via inline checkbox:
- Animate the row out
- Show brief toast: "+$800 monthly impact unlocked" (if revenue impact exists)

### 6. Keep Legacy `useDailyBriefing` + `DailyBriefingCard`

Delete both — they're replaced entirely by the new system.

---

## Files

| File | Action |
|---|---|
| `src/hooks/useDailyBriefingEngine.ts` | CREATE — Composes capital, SEO, tasks, campaigns |
| `src/components/dashboard/DailyBriefingPanel.tsx` | CREATE — Full 6-section panel |
| `src/components/dashboard/DailyBriefingCard.tsx` | DELETE — Replaced |
| `src/hooks/useDailyBriefing.ts` | DELETE — Replaced |
| `src/pages/dashboard/DashboardHome.tsx` | UPDATE — Swap `DailyBriefingCard` → `DailyBriefingPanel`, pass role context |
| `src/components/dashboard/CommandCenterAnalytics.tsx` | UPDATE — Add briefing panel at top |
| `src/hooks/useDashboardLayout.ts` | No change needed (already has `daily_briefing` in default) |

## Data Dependencies (All Existing)

- `useZuraCapital()` — top opportunity, active projects
- `useSEOTasks(orgId, { status: ['completed'] })` — automated actions today
- `useTasks()` — personal task list with revenue impact
- `useOrganizationContext()` — org scoping
- `useEffectiveRoles()` — role adaptation

## Build Order

1. Create `useDailyBriefingEngine` hook
2. Create `DailyBriefingPanel` component
3. Wire into `DashboardHome` (replace old card)
4. Wire into `CommandCenterAnalytics` (top section)
5. Delete old `DailyBriefingCard` + `useDailyBriefing`
6. TypeScript build check

