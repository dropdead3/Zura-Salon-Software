

# Levels Configurator Audit + Stylist Scorecard Enhancement

## Configurator Gaps Identified

After reviewing the full `StylistLevelsEditor.tsx` (1681 lines), `useLevelProgress.ts`, `MyGraduation.tsx`, `LevelProgressCard.tsx`, and supporting hooks, here are the gaps:

### Admin Configurator Gaps

1. **No Color Bar / Backbar criteria in level governance** — The promotion and retention criteria cover 8 KPIs (revenue, retail, rebook, avg ticket, retention rate, new clients, utilization, rev/hr) but have zero connection to Zura Color Bar metrics (reweigh compliance, waste rate, chemical cost per service). Salons investing in Color Bar would want these as graduation/retention factors.

2. **No "preview as stylist" from admin** — Admins cannot preview what a specific stylist would see on their My Level Progress page. They can see the Graduation Tracker table but not the actual stylist-facing card.

3. **Criteria comparison table missing Commission row** — The comparison matrix shows promotion and retention metrics but does not include the commission rates per level, which are configured on the same editor.

4. **Missing utilization + rev/hr in format summaries** — `formatCriteriaSummary` and `formatRetentionSummary` (lines 85-108) output inline text but skip utilization and rev/hr, even though they exist in the schema. These summaries appear on the level list rows.

### Stylist View Gaps (MyGraduation.tsx)

5. **No Color Bar performance data** — The stylist's My Level Progress page shows KPI progress bars but has zero visibility into their Color Bar metrics (reweigh compliance, waste rate, avg chemical cost, mix sessions). This data exists in `staff_backroom_performance` and `useStaffColorBarPerformance`.

6. **No holistic "Scorecard" view** — The page is split between a KPI progress card and a checklist-based graduation flow, but there is no unified scorecard that merges everything: KPIs, Color Bar, coaching signals, and overall readiness into one view.

7. **No trend indicators** — The progress bars show current vs. target but not direction (improving or declining). A stylist has no way to know if they are on an upward or downward trajectory.

8. **No peer context** — The stylist sees raw numbers but has no idea where they stand relative to salon averages or peers at their level. This context is crucial for motivation without shaming.

9. **No commission visibility** — The stylist cannot see what commission rate they currently earn or what they would earn at the next level — the core financial incentive for leveling up.

---

## Plan: Stylist Performance Scorecard

Build a unified Scorecard component on the My Level Progress page that consolidates all performance data into a single, motivating view.

### New Component: `StylistScorecard.tsx`

A comprehensive card that merges data from three sources:
- `useLevelProgress` (existing) — KPI metrics against promotion/retention targets
- `useStaffColorBarPerformance` (existing) — Color Bar operational metrics
- Salon averages from `useStaffPerformanceComposite` — peer context

**Layout:**

```text
+----------------------------------------------------------+
| PERFORMANCE SCORECARD               Current: Senior      |
| Senior → Master                     Since: Jan 2025      |
+----------------------------------------------------------+
| OVERALL READINESS              72%  ████████░░░          |
+----------------------------------------------------------+
| Commission Today: 42% svc / 15% ret                      |
| At Next Level:    48% svc / 20% ret    (+$280/mo est.)   |
+----------------------------------------------------------+
|                                                           |
| KPI PERFORMANCE           You    Target    Salon Avg  ▲▼  |
| ─────────────────────────────────────────────────────── |
| Revenue/mo           $8,200   $10,000    $7,500     ▲   |
| Retail Attach.         12%      15%       11%       ▲   |
| Rebooking              68%      75%       62%       ─   |
| Client Retention       78%      80%       73%       ▼   |
| Avg Ticket            $142     $160      $135       ▲   |
| Utilization             82%      85%       76%       ─   |
+----------------------------------------------------------+
|                                                           |
| COLOR BAR PERFORMANCE                                     |
| ─────────────────────────────────────────────────────── |
| Reweigh Compliance      88%    target 80%           ✓   |
| Waste Rate             12%    target <15%           ✓   |
| Avg Chemical Cost     $14.20   salon avg $15.80     ✓   |
| Mix Sessions            42      (30-day count)          |
+----------------------------------------------------------+
|                                                           |
| COACHING SIGNALS                                          |
| • Rebooking rate trending down — 3 pts below target      |
| • Client retention dipped — review last 2 weeks          |
+----------------------------------------------------------+
```

### Technical Details

**File: `src/components/dashboard/StylistScorecard.tsx`** (New)
- Imports `useLevelProgress`, `useStaffColorBarPerformance`, `useStylistLevels`
- Computes salon-average context by fetching peer data (same level, same location)
- Generates trend arrows by comparing current eval window vs. prior eval window (data already fetched — `useLevelProgress` pulls 2x the eval window)
- Renders commission uplift estimate: `(nextLevelCommission - currentCommission) * monthlyRevenue`
- Color Bar section only renders if the organization has Color Bar enabled (check `staff_backroom_performance` data existence)
- Coaching signals generated client-side from the same logic as `useStaffPerformanceComposite`

**File: `src/pages/dashboard/MyGraduation.tsx`** (Modify)
- Replace the standalone `LevelProgressCard` with the new `StylistScorecard` at the top
- Keep the retention warning card and checklist sections below

**File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`** (Modify)
- Fix `formatCriteriaSummary` to include utilization + rev/hr when enabled
- Fix `formatRetentionSummary` to include utilization + rev/hr when enabled
- Add a "Commission" row to the `CriteriaComparisonTable` metrics array

**File: `src/hooks/useStylistPeerAverages.ts`** (New)
- Small hook that fetches aggregated averages for stylists at the same level in the same org
- Uses `phorest_daily_sales_summary` + `appointments` with level-filtered user IDs
- Returns: `{ avgRevenue, avgRetail, avgRebook, avgRetention, avgTicket, avgUtilization }`

### Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/StylistScorecard.tsx` | **New** — Unified scorecard merging KPIs, Color Bar, peer context, trends, commission uplift |
| `src/hooks/useStylistPeerAverages.ts` | **New** — Peer average metrics for same-level context |
| `src/pages/dashboard/MyGraduation.tsx` | Replace `LevelProgressCard` with `StylistScorecard` |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Fix summary formatters + add commission row to comparison table |

**4 files. No database changes.**

