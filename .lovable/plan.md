## Goal

Ship the three audit suggestions from the previous round as a coherent set:

1. Author-time non-redundancy registry for Command Center tiles
2. Materiality gate on Executive Summary (suppress noise deltas)
3. Sparkline behind Executive Summary delta for trend-at-a-glance

---

## 1. Tile-question registry — `CARD_QUESTIONS`

**Why:** the three-redundant-$5.6k bug we just fixed was caused by drift, not malice. Without an explicit registry, the next pinned card will quietly restate an existing one.

**Where:** new file `src/components/dashboard/analytics/cardQuestions.ts`. Single source of truth — one canonical question per `cardId`.

```ts
// One sentence per surface. Two cards may not share the same question.
export const CARD_QUESTIONS = {
  executive_summary:    'Are we trending up or down vs the prior period?',
  sales_overview:       "What is the live revenue clock for this period?",
  daily_brief:          "What is today's operational pulse (appts, queue, earned)?",
  revenue_breakdown:    'What is the service vs retail mix?',
  top_performers:       'Who is the highest-earning team member this period?',
  operations_stats:     'How many clients are waiting or in service right now?',
  retail_effectiveness: 'What share of services attached a retail product?',
  rebooking:            'What share of clients rebooked before leaving?',
  capacity_utilization: 'How full is the chair across providers?',
  operational_health:   'How many locations are being monitored and healthy?',
  locations_rollup:     'Which locations are open, closing soon, or opening soon?',
  service_mix:          'Which service category drives the most revenue?',
  client_funnel:        'How many unique clients (new + returning) this period?',
  client_health:        'How many clients are at-risk, win-back, or new-no-return?',
  goal_tracker:         'How close are we to the org goal and at what pace?',
  week_ahead_forecast:  'What is the projected revenue for the next 7 days?',
  new_bookings:         'How many new bookings landed this period?',
  hiring_capacity:      'How many open chair positions are available?',
  staffing_trends:      'How is active staff count trending?',
  stylist_workload:     'What is the average stylist utilization?',
  client_experience_staff: 'Which staff lead and lag on client experience?',
  commission_summary:   'What are estimated total commission payouts this period?',
  staff_commission_breakdown: 'What does each stylist earn in commission this period?',
  true_profit:          'What is profit after chemical, labor, and waste cost?',
  staff_performance:    'How does each stylist score across the unified KPI set?',
  service_profitability:'Which services earn the most after product cost?',
  control_tower:        'Where are color bar waste, variance, and compliance issues?',
  predictive_inventory: 'Which color products will stock out based on bookings?',
  level_progress_kpi:   'How many stylists are ready to level up, on pace, or at risk?',
} as const;
```

**Invariant test:** `src/__tests__/card-questions-uniqueness.test.ts`
- Every key in `CARD_META` has a matching entry in `CARD_QUESTIONS`
- No two values in `CARD_QUESTIONS` are identical (case-insensitive trim)

This follows the project's [Canon Pattern](mem://architecture/canon-pattern): invariant + Vitest + CI enforcement. No Stylelint or override needed (not a styling concern).

---

## 2. Materiality gate on Executive Summary

**Why:** the doctrine says "if confidence is low, suppress recommendations." A `+0.4%` delta on $300 of revenue is noise dressed as signal.

**Logic** (in `PinnedAnalyticsCard.tsx`, `executive_summary` simple-view branch):

```text
if current < $500 OR prior < $500       → "Volume below comparison threshold · $X this period"
else if |deltaPct| < 2.0                → neutral pill "Trending flat · $X vs $Y prior period"
else                                    → existing +/- delta render with trend icon + sparkline
```

Thresholds chosen so a slow Tuesday at a single location doesn't trigger a confident "−47.3%" panic. Both numbers picked to be conservative; tuneable via two named constants at the top of the component:
- `EXEC_SUMMARY_MIN_VOLUME_USD = 500`
- `EXEC_SUMMARY_FLAT_DELTA_PCT = 2.0`

`Minus` icon (already imported in the previous round) renders for the flat state in muted tone. No false confidence.

---

## 3. Sparkline behind Executive Summary delta

**Why:** "are we trending?" answers visually faster than "+12.4%". Doctrine: minimal, calm, executive.

**Data source:** existing `useSalesTrend(dateFrom, dateTo, locationId)` from `useSalesData.ts` — already returns `{ overall: [{date, revenue}], byLocation }`. No new hook.

**Window:** 14 calendar days ending today, regardless of the dashboard's active date range. Reason: a 1-day "today" range gives a 1-point series, which the Sparkline already rejects as `< 2`. We want a stable trailing trend irrespective of filter chrome.

**Render placement:** below the metric label inside the `executive_summary` simple-view branch only. Uses existing `Sparkline` primitive at `src/components/ui/Sparkline.tsx` (already drop-in).

```tsx
{cardId === 'executive_summary' && trendSeries.length >= 3 && (
  <Sparkline
    data={trendSeries}
    height={20}
    className={cn('mt-1', trendTone)}   // inherits emerald / rose / muted from delta
    ariaLabel="14-day revenue trend"
  />
)}
```

Suppressed entirely when the materiality gate fires (don't trend-shame an org with no volume).

---

## Files to edit

| File | Change |
|---|---|
| `src/components/dashboard/analytics/cardQuestions.ts` | **NEW** — registry + type export |
| `src/__tests__/card-questions-uniqueness.test.ts` | **NEW** — invariant test |
| `src/components/dashboard/PinnedAnalyticsCard.tsx` | Add `useSalesTrend` for trailing-14d series; add materiality gate constants + branch in `executive_summary` case; render `<Sparkline>` under the metric label; import `CARD_QUESTIONS` and assert via existing `reportVisibilitySuppression` if a cardId is missing from the registry (dev-only soft assert) |

No DB, no edge functions, no other component touched.

---

## Out of scope

- Wiring the registry into the Customize menu hover tooltip (would be valuable but is a separate UX call — current `CARD_DESCRIPTIONS` continues to power tooltips).
- Sparkline on cards other than Executive Summary. Each card gets the lens that fits its question; other tiles already differentiate.
- Per-location sparkline. Trend uses the active `locationFilter` consistent with the rest of the card's data.

## Acceptance

- Pinning two tiles that ask the same question fails CI via the new invariant test.
- An org with $300 revenue this period and $250 prior shows "Volume below comparison threshold · $300 this period" — no spurious delta.
- Executive Summary in simple view shows `+12.4%` with a 14-day green sparkline beneath when volume is material and trend is real.
