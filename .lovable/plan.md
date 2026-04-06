

# Promotion Readiness & Staleness Card

## What We're Building
A dual-section analytics card for the Staff Analytics surface that answers two questions:
1. **Ready to Promote** — Stylists who meet all criteria for their next level (or are close, e.g. ≥90%)
2. **Stale / Stalled** — Stylists who haven't improved their promotion readiness in 6+ months, with a staleness duration indicator

## Data Source
All data comes from the existing `useTeamLevelProgress` hook, which already provides per-stylist:
- `status` (ready, in_progress, needs_attention, at_top_level, etc.)
- `compositeScore` (weighted 0–100 promotion progress)
- `isFullyQualified` (boolean)
- `timeAtLevelDays` (days since last promotion/assignment)
- `criteriaProgress[]` (per-KPI current vs target)

**New data needed**: To measure *staleness* (no improvement over 6 months), we need a historical comparison. Two options:

### Option A — Snapshot-based (requires new table)
Store periodic `composite_score` snapshots and compare current vs 6-months-ago. More accurate but requires a new `level_progress_snapshots` table + a scheduled function.

### Option B — Time-at-level heuristic (no new infra)
Use `timeAtLevelDays > 180` combined with `compositeScore < 80%` as the staleness signal. If someone has been at a level for 6+ months and isn't close to qualifying, they're stalled. This is a good Phase 1 proxy.

**Recommendation**: Start with **Option B** (no new tables), then add snapshot tracking in a future iteration for true trend-based staleness.

## Card Design

### Layout
Following the Luxury Analytics Card pattern:
- **Header**: `GraduationCap` icon + "LEVEL READINESS" title + `MetricInfoTooltip` + `AnalyticsFilterBadge`
- **Body**: Two sections with a subtle divider

**Section 1 — Ready to Promote**
- List of stylists with `isFullyQualified === true` or `compositeScore >= 90`
- Each row: avatar, name, current level → next level, composite score badge, time at level
- Green accent for fully qualified; amber for ≥90%
- Empty state: "No stylists currently qualify for promotion"

**Section 2 — Stalled Progression**
- Stylists with `timeAtLevelDays >= 180` AND `compositeScore < 80` AND status not `at_top_level`
- Each row: avatar, name, current level, composite score, staleness duration (e.g. "8 months at level")
- Sorted by staleness duration descending
- Muted red/amber accent for staleness severity

### Staleness Tiers
- 6–9 months: "Stalling" (amber)
- 9–12 months: "Stale" (orange)
- 12+ months: "Stagnant" (muted red)

## Technical Plan

### Files to Create
1. **`src/components/dashboard/analytics/LevelReadinessCard.tsx`**
   - Consumes `useTeamLevelProgress()` (already batches all team data)
   - Filters and segments into "ready" and "stalled" groups
   - Uses `PinnableCard` wrapper for Command Center pinning
   - Follows canonical card header layout (icon + title + tooltip + filter badge)
   - Uses `BlurredAmount` for any financial values if shown
   - Includes `VisibilityGate` for role-based access (admin/manager only)

### Files to Modify
2. **Staff analytics page** (wherever the staff analytics cards are rendered) — add `<LevelReadinessCard />` to the layout

### No database changes needed for Phase 1.

## Copy
- Card title: "LEVEL READINESS"
- Tooltip: "Identifies stylists who qualify for promotion and flags those whose progression has stalled for 6+ months."
- Section headers: "Ready to Promote" / "Stalled Progression"
- Staleness labels: "6mo stalling" / "9mo stale" / "12mo+ stagnant"
- Empty states: "No stylists currently qualify" / "No stalled progressions detected"

## Future Enhancement (Phase 2)
- Add `level_progress_snapshots` table with monthly composite score snapshots
- Compare current score vs 6-month-ago score for true trend-based staleness (score delta ≤ 2% = stalled)
- Add sparkline showing score trajectory per stylist

