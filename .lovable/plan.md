

## Remove Team Goal Card

Good call -- team goal analytics should derive from individual staff KPIs and personal goals, not a top-down localStorage target. This removes the interim placeholder cleanly.

### What Gets Removed

**Component file deleted:**
- `src/components/dashboard/sales/TeamGoalsCard.tsx`

**Hook file deleted:**
- `src/hooks/useTeamGoals.ts`

**References removed from:**

| File | Change |
|------|--------|
| `src/components/dashboard/analytics/SalesTabContent.tsx` | Remove `TeamGoalsCard` import and the `<PinnableCard elementKey="team_goals">` block from the goals subtab (lines ~396-398). GoalTrackerCard remains. |
| `src/components/dashboard/CommandCenterAnalytics.tsx` | Remove `TeamGoalsCard` import, the `'team_goals': 'TeamGoals'` mapping entry, and the `case 'team_goals':` render block (lines ~336-342). |
| `src/components/dashboard/PinnedAnalyticsCard.tsx` | Remove `TeamGoalsCard` import, the `'team_goals'` entries from route map, icon map, description map, metric label map, and the `case 'team_goals':` render block (lines ~740-755). |
| `src/components/dashboard/DashboardCustomizeMenu.tsx` | Remove the `team_goals` entry from the customization card list (line ~156). |
| `src/hooks/useDashboardLayout.ts` | Remove `'team_goals'` from the default layout array (line ~49). |

### What Stays

- `GoalTrackerCard` -- remains in the goals subtab (this tracks org-level goal progress)
- `useSalesGoals` hook -- still used by GoalTrackerCard
- `useAggregatedRetailGoals` -- still used elsewhere
- The goals subtab itself -- still has GoalTrackerCard content

### No Database Changes

TeamGoalsCard used localStorage only (`team-goals` key). No tables or migrations involved.

