

# Make Weights Meaningful — Allow Metric Compensation

## Problem

Currently, each metric's progress percentage is capped at 100% before the weighted average is calculated. This means the composite score can only reach 100% if **every** metric is individually at 100%. Weights are cosmetic — they affect visual fill speed but not the promotion decision.

## New Behavior

A stylist who exceeds one threshold (e.g., 150% of revenue target) can compensate for being slightly below another (e.g., 85% of retail target), as long as the **weighted composite** reaches 100%. This makes weights architecturally meaningful: a metric weighted at 40% contributes more to qualification than one at 10%.

**Example:** Revenue weighted 60%, Retail weighted 40%. Stylist hits 120% of revenue, 70% of retail.
- Composite = (120 × 60 + 70 × 40) / 100 = 72 + 28 = 100% → Qualified

## Technical Changes

### 1. Uncap individual metric percentages in composite calculation

**Files:** `src/hooks/useTeamLevelProgress.ts` and `src/hooks/useLevelProgress.ts`

In the progress array construction (lines building `percent`), change:
```
percent: target > 0 ? Math.min(100, (actual / target) * 100) : 0
```
to:
```
percent: target > 0 ? (actual / target) * 100 : 0
```

This allows over-performance (e.g., 130%) to flow into the weighted average. The composite score still determines `isFullyQualified` via `compositeScore >= 100 && tenurePasses` — no change needed there.

### 2. Cap display values in UI components

Progress bars and visual indicators still need capping at 100 for rendering. Add `Math.min(100, cp.percent)` in the UI layer where `cp.percent` is passed to `<Progress value={...}>`. Key files:

- `src/components/dashboard/StylistScorecard.tsx` — progress bar value
- `src/components/coaching/LevelProgressCard.tsx` — progress bar value
- `src/pages/dashboard/admin/GraduationTracker.tsx` — progress bar value

Display the raw percent as text (e.g., "130%") so stylists can see they're exceeding a target.

### 3. Update the Weights explainer in GraduationWizard

**File:** `src/components/dashboard/settings/GraduationWizard.tsx`

Rewrite the "How Weights Work" explainer body to:

"Weights determine how much each metric contributes to the overall readiness score. A stylist qualifies for promotion when their weighted composite score reaches 100%. Exceeding one threshold can compensate for being slightly below another — a metric with higher weight has more influence on qualification. For example, if Revenue is weighted at 60% and a stylist hits 120% of their revenue target, that surplus offsets shortfalls in lower-weighted metrics."

Remove the "Note: regardless of weights..." paragraph since it's no longer true.

### 4. Add over-performance visual indicator

In the scorecard and tracker, when a metric's `percent > 100`, show the value in emerald with a small "exceeds" indicator (e.g., "130%" in green text) so both stylists and admins can see where surplus is being generated.

## Scope

- 2 hooks modified (uncap percent calculation) — ~6 lines each
- 3 UI components updated (cap progress bar values, show raw percent) — ~3 lines each  
- 1 explainer rewrite — ~5 lines
- No database changes
- No new components

