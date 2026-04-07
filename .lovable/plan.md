

# Fix Level Tenure Tracking for Admin-Assigned Levels

## Problem
When you assign a stylist to a level via the admin UI, no `level_promotions` record is created. The system calculates "time at level" by checking `level_promotions.promoted_at`, falling back to `hire_date`. Since neither exists for your stylists, tenure shows as 0 days / N/A.

## Root Cause
The `useAssignStylistLevel` hook only updates `employee_profiles.stylist_level` — it doesn't record *when* the level was set. The tenure calculation in `useLevelProgress` and `useTeamLevelProgress` has no reliable timestamp to work with.

## Solution
Add a `stylist_level_since` column to `employee_profiles` that tracks when the current level was assigned. This column gets updated every time the level changes — whether through admin assignment, bulk assignment, or the promotion flow.

## Changes

### 1. Database Migration
- Add `stylist_level_since TIMESTAMPTZ` column to `employee_profiles`
- Default to `now()` for new rows
- Backfill existing rows: set `stylist_level_since` to the latest `level_promotions.promoted_at` where available, otherwise fall back to `updated_at` (which captured when level was last set — today for your stylists)

### 2. `src/hooks/useAssignStylistLevel.ts`
- Update both `useAssignStylistLevel` and `useBulkAssignStylistLevel` to also set `stylist_level_since: new Date().toISOString()` in the `.update()` call

### 3. `src/hooks/usePromoteLevel.ts`
- Add `stylist_level_since: new Date().toISOString()` to the `.update()` call that sets the new level

### 4. `src/hooks/useLevelProgress.ts`
- Fetch `stylist_level_since` in the employee profile query (line 74)
- Change the `levelSince` resolution (line 227) to: `profile?.stylist_level_since || latestPromotion?.promoted_at || profile?.hire_date || null`

### 5. `src/hooks/useTeamLevelProgress.ts`
- Include `stylist_level_since` in the employee profiles select
- Change `levelSince` resolution to prioritize `stylist_level_since`

### 6. Admin Override — Allow Setting Custom Date
- In the `StylistCommissionDrilldown.tsx` dialog, add an optional "Level Since" date picker below the level selector so admins can backdate the tenure when assigning levels during initial setup

## Backfill Strategy
For your current stylists (all set to `studio-artist` today), the backfill will use `updated_at` which is today's date. You can then use the date picker in the drilldown to set the correct historical date for each stylist.

## Files Changed
| File | Change |
|---|---|
| Migration | Add `stylist_level_since` column + backfill |
| `useAssignStylistLevel.ts` | Set `stylist_level_since` on assignment |
| `usePromoteLevel.ts` | Set `stylist_level_since` on promotion |
| `useLevelProgress.ts` | Prefer `stylist_level_since` for tenure calc |
| `useTeamLevelProgress.ts` | Prefer `stylist_level_since` for tenure calc |
| `StylistCommissionDrilldown.tsx` | Add "Level Since" date picker for backdating |

6 files + 1 migration.

