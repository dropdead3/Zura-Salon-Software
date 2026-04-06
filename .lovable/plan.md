

# Phase 2: Level Progress Snapshots for Trend-Based Staleness

## What We're Building
A `level_progress_snapshots` table that stores monthly composite score snapshots per stylist, plus a scheduled edge function to populate it. This replaces the current heuristic (time-at-level > 180 days) with true trend-based staleness detection: if a stylist's composite score hasn't improved by more than 2% over 6 months, they're stalled.

## Database

### New table: `level_progress_snapshots`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK → organizations | RLS scoped |
| user_id | UUID FK → auth.users | The stylist |
| stylist_level_id | UUID FK → stylist_levels | Level at snapshot time |
| composite_score | NUMERIC | 0–100 |
| criteria_snapshot | JSONB | Full criteria progress array for audit |
| snapshot_month | DATE | First of month (e.g. 2026-04-01), unique per user+org+month |
| created_at | TIMESTAMPTZ | |

- Unique constraint on `(organization_id, user_id, snapshot_month)`
- RLS: org members can SELECT; no client-side INSERT/UPDATE/DELETE
- Index on `(organization_id, user_id, snapshot_month)`

## Edge Function: `snapshot-level-progress`

Runs monthly via pg_cron. For each active stylist in each organization:
1. Calls the same composite score logic (or reads from a recent calculation cache)
2. Upserts into `level_progress_snapshots` for the current month

Since the composite score is currently computed client-side in `useTeamLevelProgress`, the edge function will replicate the core calculation server-side using the same data sources (appointments, promotion criteria, etc.) — or we take the simpler approach: **trigger a snapshot write from the client** whenever the Level Readiness Card loads, deduped by month. This avoids duplicating complex calculation logic.

**Recommended approach**: Client-side snapshot writer in `useTeamLevelProgress` that upserts the current month's scores. Simpler, no logic duplication, and the card already computes everything needed.

## Code Changes

### 1. Add snapshot upsert hook: `src/hooks/useLevelProgressSnapshots.ts`
- `useWriteLevelSnapshots(teamProgress)` — on mount, upserts current month's scores for all team members (deduped by unique constraint)
- `useReadLevelSnapshots(userId, months)` — reads historical snapshots for trend comparison

### 2. Update `LevelReadinessCard.tsx`
- Call `useWriteLevelSnapshots` to persist current scores
- Call `useReadLevelSnapshots` to fetch 6-month-ago scores
- Replace heuristic staleness filter with: `scoreDelta <= 2` over 6 months AND `compositeScore < 80`
- Keep the heuristic as fallback when no historical snapshot exists yet (graceful degradation during ramp-up)

### 3. Optional future: Add sparkline per stylist showing 6-month score trajectory

## Files

| Action | File |
|--------|------|
| Create | Migration for `level_progress_snapshots` table |
| Create | `src/hooks/useLevelProgressSnapshots.ts` |
| Modify | `src/components/dashboard/analytics/LevelReadinessCard.tsx` |

## No edge function needed in Phase 2a
The client-side write approach eliminates the need for a scheduled function. If the org has no active users viewing the dashboard for a month, that month simply has no snapshot — which is acceptable since staleness detection only matters when someone is looking.

