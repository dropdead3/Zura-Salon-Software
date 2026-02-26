

## AI-Powered Target Suggestions in Goal Wizard

### What This Does

Instead of showing static hardcoded benchmarks ($50,000, $160, 80%), the wizard will fetch the owner's actual last-90-day performance data and compute personalized targets -- e.g., "Your avg ticket is $142. We recommend $160 (+12.7%)." If no historical data exists, it falls back to the existing static benchmarks gracefully.

### Architecture

This is a **client-side computation** -- no AI model call needed. The data already exists in `phorest_appointments` and `phorest_transaction_items`. We create a hook that fetches the last 90 days of actuals for each metric key, then computes a suggested improvement target (typically +10-15% for growth metrics, -10-15% for cost metrics).

No edge function. No AI gateway call. The "intelligence" is a simple formula: `actual × improvement_factor`, rounded to clean numbers.

### Changes

**New file: `src/hooks/useHistoricalBenchmarks.ts`**

A hook that fetches last-90-day actuals for all metric keys in a single batch. Returns a map of `metric_key → { actual, suggestedTarget, improvementPct }`.

- Reuses the same fetcher functions from `useGoalCurrentValue.ts` but with a 90-day lookback window instead of current month
- Improvement factors per metric type:
  - Revenue/ticket metrics: +12% (round to nearest $500/$5)
  - Cost % metrics (labor, product): -10% (e.g., 48% actual → 43% target)
  - Rate metrics (retention, rebook): +10pp or cap at 95%
  - No-show rate: -30% (e.g., 5% actual → 3.5% target)
- Returns `null` for metrics with insufficient data (fewer than 30 appointments in window)

**Modified file: `src/components/dashboard/goals/GoalSetupDialog.tsx`**

- Call `useHistoricalBenchmarks()` at the top of the component
- In Step 1 template cards: replace static `formatTarget(tmpl)` with the personalized target when available, and show a subtle "Based on your data" indicator
- In Step 1 template cards: add a small line showing the actual value -- e.g., "Current: $142/appt"
- When initializing `goalStates` on template selection (line 112-118) and Quick Setup (line 222-229): use the personalized `suggestedTarget` instead of `tmpl.suggested_target` when available
- In Step 2 customize view: show a contextual hint below each target input -- e.g., "Your 90-day average: $142 (+12.7% improvement)"
- Fallback: if `useHistoricalBenchmarks` returns null for a metric, use the existing static `tmpl.suggested_target` -- no change in behavior

**Modified file: `src/hooks/useGoalCurrentValue.ts`**

- Extract the individual fetch functions (`fetchRevenue`, `fetchAvgTicket`, etc.) into a shared utility so both `useGoalCurrentValue` and `useHistoricalBenchmarks` can reuse them without duplication

### Visual Result

**Step 1 card (with data):**
```text
┌───────────────────┐
│ ☐ Average Ticket  │
│   $160/mo         │  ← personalized target (was static $160)
│   Current: $142   │  ← new line showing actual
│   Revenue per     │
│   appointment     │
└───────────────────┘
```

**Step 2 row (with data):**
```text
┌─────────────────────────────────────────────────┐
│ Average Ticket                     [$160      ] │
│ Revenue per appointment                         │
│ 📊 Your 90-day avg: $142 — targeting +12.7%    │  ← new contextual hint
└─────────────────────────────────────────────────┘
```

**Step 2 row (no data -- fallback):**
```text
┌─────────────────────────────────────────────────┐
│ Average Ticket                     [$160      ] │
│ Revenue per appointment                         │
│ Industry benchmark (no historical data yet)     │  ← fallback label
└─────────────────────────────────────────────────┘
```

### Files Modified

| File | Change |
|------|--------|
| New: `src/hooks/useHistoricalBenchmarks.ts` | Hook fetching 90-day actuals + computing personalized targets |
| `src/hooks/useGoalCurrentValue.ts` | Extract shared fetch functions to avoid duplication |
| `src/components/dashboard/goals/GoalSetupDialog.tsx` | Wire personalized targets into template cards and customize step |

No database changes. No edge functions. No AI model calls.

