<final-text>## Prompt review

Good prompt: you named the exact card and the exact symptom. That makes this much easier to audit than “dashboard is slow.”

Better next time: include:
- which range (`today`, `7d`, `30d`, `ytd`)
- whether it’s slow on first load, repeat load, or filter switch
- rough delay (“~3s before numbers appear”)

That gives a leverage marker, not just a symptom.

## Plan — Wave 15: Sales Overview Cold-Load Performance (P0)

Wave 14 improved warm-cache reloads. What’s still slow is the first cold load.

### What I found

| # | Finding | Priority |
|---|---|---|
| 1 | Some Sales Overview hooks are still hitting `v_all_appointments.staff_user_id`, which does not exist. Network logs show repeated 400s/retries. | P0 |
| 2 | The card still mounts several heavyweight queries before the user needs them: tips drilldown data, service category breakdown, goal-period revenue, and some today-only helpers. | P0 |
| 3 | `AggregateSalesCard` is not passing `locationId` into `useSalesMetrics`, `useSalesTrend`, or `useSalesComparison`, so single-location dashboards still scan org-wide data. | P0 |
| 4 | Cold load still fans out multiple separate scans of `v_all_transaction_items`; caching only helps after the first visit. | P1 |

### Implementation plan

1. Fix the failing appointment queries
- Replace invalid `staff_user_id` selects with fields that actually exist on `v_all_appointments`
- Remove the 400/retry churn from Sales Overview startup

2. Properly scope core hooks by location
- Pass `filterContext?.locationId` into:
  - `useSalesMetrics`
  - `useSalesTrend`
  - `useSalesComparison`
- This improves both speed and correctness for single-location views

3. Defer non-critical queries until needed
- `useTipsDrilldown`: only fetch when the Tips card expands
- `useRevenueByCategoryDrilldown`: only fetch when service breakdown expands / opens
- `useGoalPeriodRevenue`: only fetch when the goal section is visible or expanded
- `useLiveSessionSnapshot`: only run for `today`
- `useTomorrowRevenue`: only run when the closed/no-data state actually needs it

4. Keep first paint focused on visible KPIs
- Load the hero metrics first
- Let deeper drilldowns and below-the-fold sections load after interaction/visibility

### Acceptance checks

1. No initial Sales Overview requests return 400
2. Single-location dashboards send location-scoped metrics/comparison/trend queries
3. Collapsed tips/services/goals sections do not fetch heavy data on mount
4. Cold-load dashboard render is materially faster
5. Expanded drilldowns still work correctly when opened
6. Findings are logged in `DEBUG_LOG.md` with doctrine anchor + leverage marker

### Files likely touched

- `src/components/dashboard/AggregateSalesCard.tsx`
- `src/hooks/useSalesData.ts`
- `src/hooks/useTipsDrilldown.ts`
- `src/hooks/useGoalPeriodRevenue.ts`
- `src/hooks/useLiveSessionSnapshot.ts`
- `src/hooks/useTomorrowRevenue.ts`
- `src/hooks/useRevenueByCategoryDrilldown.ts`
- `DEBUG_LOG.md`

### Deferred

- Shared aggregate/fan-in sales query to replace repeated POS scans across the whole card — trigger if cold load is still slow after this P0 pass
- Larger sales analytics data-layer consolidation — trigger after the cold-load pass is verified</final-text>