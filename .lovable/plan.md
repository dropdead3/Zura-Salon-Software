

## Goals Tab: Owner/Leadership Goal Architecture

Great instinct to build this from the leadership perspective first. Here's my thinking on the most impactful goal-setting metrics for salon owners, organized by the categories that actually drive scaling decisions.

---

### The Goal Categories That Matter for Salon Owners

**1. Revenue Goals** (already partially built)
- **Monthly/Weekly Revenue Target** -- exists via GoalTrackerCard + localStorage
- **Revenue per Chair/Station** -- how productive is your physical space?
- **Average Ticket** -- are stylists upselling services and add-ons?
- **Retail Revenue Target** -- exists via retail_sales_goals table

**2. Profitability Goals** (the ones most owners neglect)
- **Labor Cost %** -- total labor as % of revenue (healthy: 40-48%)
- **Net Margin Rate** -- after labor + product costs (healthy: 15-25%)
- **Cost per Acquisition** -- what does it cost to get a new client?
- **Product Cost %** -- backbar + retail COGS as % of revenue

**3. Client Health Goals** (retention is cheaper than acquisition)
- **Client Retention Rate** -- % returning within rebooking window (target: 75-85%)
- **Rebook at Checkout Rate** -- % who book next visit before leaving (target: 60-75%)
- **New Client %** -- healthy pipeline without over-reliance (target: 15-25%)
- **Client Frequency** -- average visits per client per year

**4. Efficiency Goals** (doing more with what you have)
- **Utilization Rate** -- % of available slots booked (target: 80-90%)
- **Revenue per Labor Hour** -- dollar output per paid hour
- **No-Show/Cancellation Rate** -- revenue leakage (target: <5%)

**5. Staffing & Team Goals** (the people side)
- **Staff Retention** -- turnover rate (salon industry avg is brutal: ~60%/yr)
- **Revenue per Stylist** -- individual productivity benchmark
- **Training Hours** -- investment in team development
- **Staff Goal Participation** -- % of team with active personal goals

---

### What I Recommend Building

Rather than showing all of these at once (that would violate the "high signal, low noise" doctrine), I propose a **Goal Architecture Setup + Dashboard** approach:

#### Phase 1: Goal Setup Wizard + Goal Dashboard Cards

**Goal Setup**: A guided flow where the owner selects which goal categories they want to track, sets targets per category, and defines warning/critical thresholds. This uses the existing `kpi_definitions` table which already has target, warning, and critical thresholds.

**Goal Dashboard**: The goals subtab becomes a structured grid of goal cards organized by category, each showing current value vs target with pace indicators (reusing the GoalTrackerCard pattern).

#### Architecture

**Database**: The `kpi_definitions` table already supports this perfectly -- it has `metric_key`, `target_value`, `warning_threshold`, `critical_threshold`, `unit`, and `cadence`. We just need to:
1. Create an `organization_goals` table for org-level targets (monthly revenue, margin %, etc.) that aren't KPI-metric-based -- or extend the existing `kpi_definitions` usage
2. The `stylist_personal_goals` table already exists for individual staff targets

**Current gap**: The GoalTrackerCard uses localStorage for revenue targets (`useSalesGoals`). This should migrate to the database.

---

### Proposed Goals Tab Layout

```text
┌─────────────────────────────────────────────────────┐
│  GOALS OVERVIEW                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Revenue  │ │ Profit   │ │ Client   │ │ Team    ││
│  │ 78% ▲    │ │ 62% ▼    │ │ 85% ●    │ │ 4/6 set ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
├─────────────────────────────────────────────────────┤
│  REVENUE GOALS                                       │
│  ┌─────────────────────┐ ┌────────────────────────┐ │
│  │ Monthly Revenue     │ │ Average Ticket         │ │
│  │ $38k / $50k  76%    │ │ $142 / $160  89%       │ │
│  │ ▓▓▓▓▓▓▓░░░         │ │ ▓▓▓▓▓▓▓▓░░            │ │
│  └─────────────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  PROFITABILITY GOALS                                 │
│  ┌─────────────────────┐ ┌────────────────────────┐ │
│  │ Labor Cost %        │ │ Net Margin             │ │
│  │ 48% / 45% target    │ │ 18% / 20% target       │ │
│  │ ⚠ Above target      │ │ ▓▓▓▓▓▓▓▓░░            │ │
│  └─────────────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  CLIENT HEALTH GOALS                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Retention │ │Rebook    │ │New Client│            │
│  │ 82%/80%  │ │ 65%/70%  │ │ 18%/20%  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│  TEAM GOALS                                          │
│  Staff with active goals: 4 of 6                     │
│  ┌────────────────────────────────────────────────┐  │
│  │ Sarah M.  $8.2k / $10k  │ 82%  On Track      │  │
│  │ Alex T.   $6.1k / $8k   │ 76%  Behind        │  │
│  │ Jordan R. $9.4k / $9k   │ 104% Ahead         │  │
│  │ No goal set: Mike D., Lisa P.                 │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/dashboard/goals/GoalsOverviewHeader.tsx` | New -- category summary tiles (Revenue, Profit, Client, Team) |
| `src/components/dashboard/goals/GoalCategorySection.tsx` | New -- reusable section with goal cards per category |
| `src/components/dashboard/goals/GoalCard.tsx` | New -- individual goal card with progress bar, pace, target |
| `src/components/dashboard/goals/GoalSetupDialog.tsx` | New -- dialog to add/edit goal targets using kpi_definitions |
| `src/components/dashboard/goals/TeamGoalsSummary.tsx` | New -- aggregated staff goal participation + breakdown |
| `src/components/dashboard/analytics/SalesTabContent.tsx` | Modify -- replace single GoalTrackerCard with full goals layout |
| `src/hooks/useOrganizationGoals.ts` | New -- fetches kpi_definitions filtered to goal-relevant metrics |
| DB migration | New table `organization_goals` for org-level targets (revenue, margin) that migrate from localStorage |

### Database Change

Create `organization_goals` table to replace localStorage-based sales goals:

```sql
CREATE TABLE public.organization_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  metric_key TEXT NOT NULL,        -- 'monthly_revenue', 'labor_cost_pct', etc.
  target_value NUMERIC NOT NULL,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  goal_period TEXT NOT NULL DEFAULT 'monthly',  -- 'weekly', 'monthly', 'quarterly'
  unit TEXT NOT NULL DEFAULT '$',   -- '$', '%', 'count'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, location_id, metric_key, goal_period)
);
```

This replaces the localStorage approach in `useSalesGoals` and gives us proper tenant-scoped, database-backed goal storage with the same threshold model as `kpi_definitions`.

### What Stays

- `GoalTrackerCard` -- becomes one card within the Revenue Goals section (refactored to read from `organization_goals` instead of localStorage)
- `kpi_definitions` table -- continues to serve KPI architecture; `organization_goals` is specifically for owner-set targets
- `stylist_personal_goals` -- feeds the Team Goals section

---

### Enhancement Suggestions

After this ships, natural next steps would be:
1. **Goal vs Actual trending** -- historical chart showing goal attainment over past months
2. **Goal cascade** -- org goals auto-suggest individual staff targets
3. **Zura Intelligence integration** -- Weekly Brief references goal progress and recommends lever adjustments

