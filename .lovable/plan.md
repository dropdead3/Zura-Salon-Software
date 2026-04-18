

## Diagnosis

The Rev/Hour KPI on the dashboard (line 1343 / 1420 of `AggregateSalesCard.tsx`) is showing $61.00 on a sales-free new day because of a **bad fallback chain**:

```js
const hours = todayActual?.actualServiceHours > 0 
  ? todayActual.actualServiceHours 
  : (metrics?.totalServiceHours || 0);
const rev = todayActual?.hasActualData 
  ? todayActual.actualRevenue 
  : (metrics?.totalRevenue || 0);
return hours > 0 ? rev / hours : 0;
```

When `todayActual.hasActualData === false` (no completed POS sales today), it falls back to `metrics?.totalRevenue` from `useSalesMetrics({today, today})`.

Inside `useSalesMetrics` (`src/hooks/useSalesData.ts` line 393–396), the revenue source switches:
- If `txItems.length > 0` → use POS transaction revenue (correct → 0).
- If `txItems.length === 0` → **fall back to `appointment.total_price - tip` summed across today's `v_all_appointments` rows.**

So on a fresh day with **scheduled but uncompleted appointments**, the KPI displays **expected/projected revenue per booked hour**, not actual. That's the $61 — it's the salon's *upcoming book* divided by booked hours, dressed up as if it were realized revenue.

This violates the "Today" semantic: every other tile (Revenue Today, Transactions, Avg Ticket) correctly shows $0 because they bind to `todayActual.hasActualData`. Rev/Hour is the only one that resurrects projected values via the metrics fallback.

The same issue exists in two places (the duplicated render branches at ~1343 and ~1420) and a related helper `revenuePerHour` (line 429) used in past-range display only — that one is fine for past ranges but would need to stay correct for non-today flows.

## Fix

**Make Rev/Hour bind strictly to actuals when the range is "today", with no projection fallback.** Match the pattern used by the Revenue, Transactions, and Avg Ticket tiles directly above it.

New formula for the "today" branch:
```js
// today: use actuals only — no appointment-based projection fallback
const rev = todayActual?.hasActualData ? todayActual.actualRevenue : 0;
const hours = todayActual?.actualServiceHours ?? 0;
const value = hours > 0 ? rev / hours : 0;
```

Behavior on a sales-free new day: rev = 0, hours may be > 0 (booked appts), result = $0. Once the first sale lands, both numerator and denominator are real.

For the **past-range** branch (`pastActualActive`), keep the existing path — it correctly uses `pastActual.actualRevenue` divided by `metrics.totalServiceHours`. Past appointments' total_price IS realized revenue once the day has ended, so the fallback is acceptable historically. (Optional follow-up: tighten that too, but not needed to fix the bug the user reported.)

For the **else** branch (forward ranges like `todayToEom`), keep the existing `revenuePerHour` calculation — it represents projected book value per hour, which is correct for forecast contexts.

## Scope

Two render sites (mobile-collapsed grid at ~line 1343, desktop grid at ~line 1420). Same expression, swap with the actuals-only formula. No hook changes, no type changes, no migration.

## Out of scope

- Refactoring the duplicated render branches into a shared component (separate cleanup loop).
- Tightening `useSalesMetrics`'s appointment-fallback behavior globally — that fallback is used elsewhere (past ranges) and changing it has wider blast radius.
- The animation/fade work from the previous loops.

## Files

- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — replace the inline IIFE on lines ~1343 and ~1420 so the `isToday` branch returns actuals-only Rev/Hour (no `metrics.totalRevenue` / `metrics.totalServiceHours` fallback). Past-range and forward-range branches unchanged.

