

## Add "Tips by Stylist" Breakdown (Total Tips Earned)

Great observation — the current drilldown only shows an **avg tip rate** ranking with a 10-appointment minimum, which filters out stylists who may have earned tips but haven't hit that threshold yet. That's why you see $551 in total tips at the top but "No tip data recorded" below. The drilldown should also show **who earned how much** in total tips.

### Root Cause

The `useTipsDrilldown` hook uses `minAppointments = 10` as a hard filter. Any stylist with fewer than 10 appointments is excluded from the `byStylist` array entirely. So even though $551 in tips exists in the data, no stylists qualify for the ranking view.

### Plan

**1. Add a second stylist list with no minimum threshold** — `useTipsDrilldown` hook

Add an optional second output `allStylists` (or lower/remove the threshold for a separate list) that includes **all** stylists who received at least one tip, sorted by `totalTips` descending. This avoids changing the existing `byStylist` array which is used for the avg-rate coaching view.

Concretely, in `useTipsDrilldown.ts` (around line 174-193), build a parallel `byTotalTips` array with `minAppointments = 1` (at least 1 appointment with a tip), sorted by `totalTips` desc. Add it to the return type.

**2. Add "Tips by Stylist" section** — `TipsDrilldownPanel.tsx`

Insert a new section **above** the existing "Top Tip Earners" section (which is the avg-rate ranking). This new section:

- Header: `$ Tips by Stylist` (DollarSign icon)
- Shows each stylist with: avatar, name, total tips earned, tip %, appointment count
- Sorted by total tips descending
- No 10-appointment minimum — if they got a tip, they appear
- Capped at 10 rows with "Show all" toggle (reusing existing pattern)

**3. Rename existing section for clarity**

Rename "Top Tip Earners" → "Avg Tip Rate Ranking" (or "Tip Rate by Stylist") to differentiate from the new total-tips view. Keep the 10-appointment minimum on this section since rate metrics need statistical significance.

### Technical Details

**File: `src/hooks/useTipsDrilldown.ts`**

- Around line 174, after building the filtered `byStylist` array, build a second array `byTotalTips` from the same `stylistMap` but with no `minAppointments` filter (only requiring `totalTips > 0`), sorted by `totalTips` desc
- Add `byTotalTips: StylistTipMetrics[]` to the `TipsDrilldownData` interface

**File: `src/components/dashboard/sales/TipsDrilldownPanel.tsx`**

- Destructure `byTotalTips` from the hook (line 79)
- Add a new "Tips by Stylist" section before the existing "Top Tip Earners" block (around line 264)
- Reuse the existing `StylistTipRow` component but with a slightly modified layout emphasizing total tips first (or create a `TotalTipRow` variant)
- Apply the same region/location filtering as `filteredStylists`
- For the empty state (line 231-236), check `byTotalTips.length` as well — if `byTotalTips` has data but `filteredStylists` is empty, show the total tips section but note that the rate ranking needs more data

### What Changes for the User

| Before | After |
|---|---|
| $551 total tips shown, but "No tip data" below | **Tips by Stylist** section shows exactly who earned that $551 |
| Only avg-rate ranking (needs 10+ appointments) | Two views: total tips (no minimum) + rate ranking (10+ min) |
| Can't see tip distribution when team is small | Always see tip distribution if any tips exist |

### Scope

~40 lines added across 2 files. No new queries — reuses existing appointment data.

