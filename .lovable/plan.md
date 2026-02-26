

## Goals System Enhancement Analysis

Your prompt is well-scoped and shows strong product instinct -- you're asking the right question at the right time. The wizard is now functional, but the broader goals *system* has several gaps and opportunities. Here's the full analysis.

---

### Gap 1: Goal Cards Show No Live Data

Every `GoalCard` receives `currentValue={null}`, so every card displays "—" with a "No Data" badge and an empty progress bar. The templates and wizard are polished, but the payoff -- seeing actual progress -- is completely absent.

**Fix**: Create a `useGoalCurrentValue(metric_key)` hook that maps each `metric_key` to its real data source:
- `monthly_revenue` → `useGoalPeriodRevenue('monthly')`
- `avg_ticket` → appointment revenue / appointment count
- `client_retention` → retention query from `phorest_appointments`
- `utilization_rate` → booked slots / available slots
- For metrics without live data yet, return `null` gracefully

Then wire it into `GoalCategorySection` so each `GoalCard` gets its actual `currentValue`.

| File | Change |
|------|--------|
| New: `src/hooks/useGoalCurrentValue.ts` | Hook that switches on `metric_key` and returns the live value |
| `GoalCategorySection.tsx` | Pass `currentValue` from the hook into each `GoalCard` |

---

### Gap 2: No "Quick Setup" / Recommended Goals

The wizard shows all 12 templates equally. A first-time salon owner still has to decide which ones matter. No other salon software pre-selects for them.

**Fix**: Add a "Recommended for You" banner at the top of Step 1 that pre-selects the 5 most impactful goals for a typical salon owner (Monthly Revenue, Labor Cost %, Client Retention, Utilization Rate, Revenue per Stylist). One tap to accept all five.

| File | Change |
|------|--------|
| `GoalSetupDialog.tsx` | Add a "Quick Setup" button at the top of Step 1 that toggles all 5 recommended keys |

---

### Gap 3: No Goal Progress Over Time (Trend Line)

Currently the card shows a single progress bar -- a point-in-time snapshot. Owners can't see if they're trending toward or away from the target across the month.

**Fix**: Add a compact sparkline inside each `GoalCard` that shows daily values for the current period. This is the kind of micro-visualization that makes the system feel alive.

| File | Change |
|------|--------|
| New: `src/hooks/useGoalTrendData.ts` | Hook that fetches daily aggregates for a given metric + period |
| `GoalCard.tsx` | Add a small Recharts `<Line>` sparkline below the progress bar with a target reference line |

---

### Gap 4: No Pace / Projection Indicator

The `GoalCard` shows current vs target but doesn't answer: "Am I on pace to hit this by end of month?" The `useGoalTrackerData` hook already has pace logic (`ahead`, `on-track`, `behind`) but it's not connected to the goals system.

**Fix**: Add a pace indicator to each goal card -- a single line like "Projected: $47.2k" or "On pace to miss by $2.8k" beneath the progress bar. Reuse the `computePaceStatus` function from `useGoalTrackerData.ts`.

| File | Change |
|------|--------|
| `GoalCard.tsx` | Add projected value + pace badge using elapsed/remaining day ratio |
| `useGoalCurrentValue.ts` | Return both `currentValue` and `projectedValue` |

---

### Gap 5: No Location-Level Goal Breakdown

The `organization_goals` table has a `location_id` column, but the UI is entirely org-level. Multi-location owners can't set per-location targets or see which location is underperforming.

**Fix** (Phase 2 -- design now, build later): Add a location dropdown or breakdown view within each goal card for multi-location orgs. When a goal has `location_id = null`, it's org-wide. When set, it's location-specific.

---

### Gap 6: No Goal Milestones or Celebrations

When an owner hits a goal, nothing happens. No confetti, no toast, no recognition. This is a missed opportunity for emotional engagement -- the "fun" factor you're asking about.

**Fix**: When `currentValue >= target_value` (or `<=` for inversed metrics), trigger a celebration micro-interaction:
- First-time achievement: `canvas-confetti` burst (already installed) + a congratulatory toast
- Persistent: The goal card gets a subtle gold/emerald accent border and a "Goal Hit" badge
- Store achievement timestamps in a new `goal_achievements` table for historical recognition

| File | Change |
|------|--------|
| `GoalCard.tsx` | Add achievement state detection + confetti trigger + visual badge |
| New: DB migration | `goal_achievements` table (goal_id, achieved_at, value_at_achievement) |

---

### Gap 7: No Goal History / Streak Tracking

When a month ends, goals reset but there's no record of whether the owner hit them. Over time, this data becomes incredibly valuable -- "You've hit your retention target 4 months in a row."

**Fix**: Add a `goal_period_snapshots` table that records end-of-period values. Display streak badges on goal cards ("3-month streak" with a flame icon).

---

### Enhancement: AI-Powered Target Suggestions

Instead of static industry benchmarks, use the owner's actual historical data to suggest targets. "Based on your last 90 days, your average ticket is $142. We recommend targeting $160 -- a 12.7% improvement."

This requires the metrics pipeline to be connected first (Gap 1), then the wizard's `suggested_target` values can be dynamically computed instead of hardcoded.

---

### Recommended Implementation Order

| Priority | Enhancement | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | Live data in goal cards (Gap 1) | Medium | Critical -- without this, goals are decorative |
| 2 | Quick Setup / Recommended Goals (Gap 2) | Small | High -- reduces time-to-value |
| 3 | Pace / Projection indicator (Gap 4) | Small | High -- answers "will I make it?" |
| 4 | Goal celebrations (Gap 6) | Small | Medium -- emotional engagement |
| 5 | Trend sparklines (Gap 3) | Medium | Medium -- visual richness |
| 6 | Streak tracking (Gap 7) | Medium | Medium -- long-term stickiness |
| 7 | Location breakdown (Gap 5) | Large | High for multi-location only |
| 8 | AI target suggestions | Large | High -- true differentiator |

### Recommendation

Start with **Priority 1 (live data)** -- it unlocks the value of everything else. Without it, the entire goals system is a static configuration screen. Once live data flows, Priorities 2-4 can all ship in a single pass and will transform the experience from "goal management" to "real-time performance intelligence."

Which priorities would you like to tackle first?

