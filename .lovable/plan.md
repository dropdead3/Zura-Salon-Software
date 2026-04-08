

# Wire Evaluation Window into Level Progress Card

## Problem

The Level Progress card currently computes metrics using `computeMetrics(evalDays)`, which correctly uses the configured evaluation window (e.g., 90 days) and normalizes revenue to a monthly average. However, the card **never communicates this to the viewer**. The result:

- A salon owner sees "Service Revenue: $1,558 / min $5,000" with no context on what time period produced that number
- It looks like a month-to-date snapshot, so it always appears "wrong" compared to any single month in Phorest
- The retention section shows no eval window at all — only the promotion footer mentions it
- There's no explanation that "$1,558" means "monthly average over the last 90 days" (or whatever the configured window is)

The underlying calculation is actually correct — the issue is **transparency**.

## Changes

### File 1: `src/components/coaching/LevelProgressCard.tsx`

**Retention warning section** — Add evaluation window context:
- Below the "Below minimum standards" header, add a line: `"Measured over a {N}-day rolling window (monthly avg)"`
- This uses `progress.retention.evaluationWindowDays` which is already in the data

**Promotion "What You Need" section** — Add eval window subtitle:
- Below the "What You Need" heading, add: `"Rolling {N}-day average · Evaluated {startDate} – today"`
- Computed from `progress.evaluationWindowDays`

**Revenue labels** — Clarify averaging:
- When `evalDays > 30`, append "(monthly avg)" qualifier to the revenue metric label in `CriterionRow` or via a subtitle, so "$1,558/mo" reads as a monthly average over the window, not a raw monthly total
- Same for retention failure rows — add eval window context

**Footer** — Show both windows when they differ:
- Currently only shows promotion eval window. When the retention eval window differs, show both: `"Promotion: {N}-day window · Retention: {M}-day window"`

**MetricInfoTooltip update** — Update the card-level tooltip to explain: "Performance is evaluated as a rolling average over the configured evaluation window. Revenue figures represent the monthly average across that period."

### File 2: `src/hooks/useLevelProgress.ts`

No logic changes needed — the hook already correctly:
- Uses `retentionCriteria.evaluation_window_days` for retention metrics (line 315)
- Uses `nextCriteria.evaluation_window_days` for promotion metrics (line 122)
- Normalizes revenue to monthly: `(totalRevenue / evalDays) * 30` (line 242)
- Exposes `evaluationWindowDays` on the result and `retention.evaluationWindowDays`

## Summary

| File | Change |
|---|---|
| `LevelProgressCard.tsx` | Add eval window labels to retention and promotion sections; clarify revenue averaging; update tooltip |

1 file, no database changes. Pure transparency/UX fix.

