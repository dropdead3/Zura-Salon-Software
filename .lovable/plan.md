

# Redesign Level Progress Card for Clarity

## Problem
The current layout mixes retention warnings, progress bars, and targets in a way that makes it hard to quickly understand: (a) where you are now, (b) what's needed for the next level, and (c) how far off each metric is. The "current / target" format buried in small text next to progress bars doesn't create clear separation between "your stats" and "what's required."

## Design

### New Layout Structure

```text
┌──────────────────────────────────────────────┐
│ 🎓 LEVEL PROGRESS                      25%  │
│    Studio Artist → Core Artist               │
├──────────────────────────────────────────────┤
│  ⚠ Retention Warning (if applicable)        │
│  ... failures listed ...                     │
├──────────────────────────────────────────────┤
│  Overall Readiness  ████████░░░░░░░░░  25%   │
├──────────────────────────────────────────────┤
│  ┌─ WHAT YOU NEED ─────────────────────────┐ │
│  │ Metric        Target    You    Gap      │ │
│  │ ──────────    ──────    ───    ───      │ │
│  │ Svc Revenue   $8,000    $1,558  -$6,442 │ │
│  │ Retail Att.   11.0%     5.9%   -5.1 pts │ │
│  │ Rebooking     63.0%     0.0%   -63.0    │ │
│  │ Avg Ticket    $200      $117   -$83     │ │
│  │ Retention     73.0%     0.0%   -73.0    │ │
│  │ Utilization   80.0%     71.0%  -9.0     │ │
│  │ Rev/Hr        $75/hr    $48/hr -$27     │ │
│  │ Tenure        90d       0d     90d      │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Each row has a thin progress bar below it   │
│  Color: emerald (met) / primary (75%+) /     │
│         amber (<75%)                         │
├──────────────────────────────────────────────┤
│  💲 Income Opportunity                       │
│  Commission Today  |  At Core Artist  |  +$  │
├──────────────────────────────────────────────┤
│  90-day rolling window    Requires approval  │
└──────────────────────────────────────────────┘
```

### Key Changes

1. **Reframe section header**: Change "KPI Performance" to **"What You Need"** — a clear directive that this section shows next-level requirements vs current standing.

2. **Reorder columns**: Put **Target first, then You, then Gap**. The mental model becomes "here's what's required → here's where you are → here's the delta." This reverses the current "You / Target" order.

3. **Show explicit gap column**: Add a **Gap** column showing the shortfall in human-readable form (e.g., `-$6,442`, `-5.1 pts`, `-63%`). Met criteria show a green checkmark instead. This replaces the buried "X more needed" text below each bar.

4. **Color-code the gap**: Red/amber text for shortfalls, emerald for met metrics. Instantly scannable.

5. **Met metrics visual**: Rows where `percent >= 100` get a subtle emerald left-border or checkmark, making it obvious what's already achieved vs what needs work.

6. **Keep progress bars** but make them secondary — thin `h-1` bars below each row for visual reinforcement, not the primary data communication.

7. **Remove "X more needed" text lines**: Redundant with the new gap column. This also tightens vertical spacing significantly.

### File: `src/components/coaching/LevelProgressCard.tsx`

- Restructure `CriterionRow` to show Target → Current → Gap in a grid
- Gap column: compute and format the delta with sign, color-code red vs green
- Add checkmark icon for met criteria
- Remove the standalone "X more needed" paragraph
- Keep progress bar as `h-1` below the row

### File: `src/components/dashboard/StylistScorecard.tsx`

- Apply the same column reordering (Target → You → Gap → Trend)
- Replace the "KPI Performance" heading with "What You Need" (only when `hasNextLevel`)
- Add gap column with formatted shortfall values
- For top-level stylists (no next level), keep heading as "Current Performance"

## Files Changed
| File | Change |
|---|---|
| `LevelProgressCard.tsx` | Restructure criterion rows: Target → You → Gap, remove "more needed" text |
| `StylistScorecard.tsx` | Same column reorder + gap column, rename section header |

2 files, no database changes.

