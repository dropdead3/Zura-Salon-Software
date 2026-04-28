## Problem

In the Command Center's **Simple View**, every other analytic card collapses into a uniform mini KPI tile (icon + label + one primary metric + tooltip + "View →" link, ~160px tall, defined in `PinnedAnalyticsCard.tsx` lines 386–716).

The **Level Progress** card does not. It renders its full 4-bucket leadership layout because:

1. `level_progress` is registered as a **dashboard section** in `DashboardHome.tsx` (line 686) that renders `LevelProgressNudge` → `LevelProgressKpiCard` (the full detailed component). Dashboard sections ignore the simple/detailed toggle.
2. `level_progress_kpi` is also registered as a **pinnable analytic card**, but it has no entry in `CARD_META` / `CARD_DESCRIPTIONS` / `CARD_LINKS` inside `PinnedAnalyticsCard.tsx`, so the compact branch returns `null` (line 389) and only the detailed switch case (line 936) ever renders.

Net effect: the user sees the detailed card via the dashboard-section path, regardless of view mode.

## Fix

### 1. Register `level_progress_kpi` in the compact metadata (PinnedAnalyticsCard.tsx)

Add three entries so the compact branch renders it like every other mini tile:

- **`CARD_META`** → `{ icon: GraduationCap, label: 'Level Progress' }`
- **`CARD_DESCRIPTIONS`** → "Stylists by promotion readiness: ready to level up, on pace, at risk, or needs review."
- **`CARD_LINKS`** → `{ label: 'Team Progress', href: '/dashboard/admin/team-directory' }` (matches existing "View team progress" deep link)

### 2. Add a compact metric branch in the `switch (cardId)` block

Use `useTeamLevelProgress()` (already powering the detailed card) to surface **one primary lever** in the tile, per UI Canon ("one primary lever, maybe one secondary").

Priority logic (highest-signal first):

```
if counts.belowStandard > 0   → "{n} need review"   (rose dot)
else if counts.ready > 0      → "{n} ready to level up" (emerald dot)
else if counts.atRisk > 0     → "{n} at risk"       (amber dot)
else                          → "{total} on pace"   (primary dot)
```

Subtext: `"{total} stylists tracked"`.

This honors the doctrine — silence-by-priority, ranked leverage, never a 4-up grid in simple view.

### 3. Remove the duplicate dashboard-section path

In `DashboardHome.tsx` `sectionMap` (line 686), `level_progress` currently renders `<LevelProgressNudge />`, which always shows the full leadership card to owners. Two options:

- **Option A (recommended):** Keep the section entry but make it render the **stylist-only** view (`MyLevelProgressNudge`). Leadership users get the simple/detailed toggle exclusively via the analytics card. This eliminates duplication and respects the [Stylist Privacy Contract](mem://architecture/stylist-privacy-contract).
- **Option B:** Remove `level_progress` from `sectionMap` entirely and add it to the [Dashboard Section Retirement Registry](mem://architecture/dashboard-section-retirement-registry). Stylists would then need a different surface for their personal nudge.

Going with **Option A** preserves the stylist-facing nudge while making the leadership card a pure analytic surface that obeys the simple/detailed toggle.

### 4. Add a hook to expose `LevelProgressKpiCard` as the analytics-grid child only

`LevelProgressNudge.tsx` keeps its current dual-mode export, but the leadership branch is no longer used by `DashboardHome`'s section map — only by the analytics hub and the pinned-card detailed path.

## Files to edit

- `src/components/dashboard/PinnedAnalyticsCard.tsx` — add `CARD_META` / `CARD_DESCRIPTIONS` / `CARD_LINKS` entries and a `case 'level_progress_kpi':` block in the compact switch.
- `src/pages/dashboard/DashboardHome.tsx` — change `sectionMap.level_progress` to render only the stylist-facing nudge (or split: leadership users see nothing here because the analytic card covers it).
- `src/components/dashboard/LevelProgressNudge.tsx` — export `MyLevelProgressNudge` so DashboardHome can render the stylist-only branch directly.

## Result

- **Simple view (leadership):** A single mini KPI tile — "3 need review · 19 stylists tracked" — sized identically to `executive_summary`, `top_performers`, etc., with the GraduationCap icon, info tooltip, and a "View Team Progress →" link.
- **Detailed view (leadership):** The existing 4-bucket layout renders unchanged.
- **Stylist view:** Personal level-progress nudge continues to render via the dashboard section, unaffected.
- **No duplication:** the leadership 4-bucket card no longer renders twice in detailed mode.
