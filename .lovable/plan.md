

# Fix Sales Overview Revenue Discrepancy

## Root Cause (Three Issues)

### Issue 1: Tips included in "Scheduled Services Today"
`originalExpected` sums `total_price` which includes `tip_amount` ($76 today). The card says "Excludes Tips" but the scheduled total doesn't exclude them. Should be $5,143, not $5,219.

### Issue 2: Completed-but-not-checked-out appointments treated as $0
Phorest marks appointments "completed" when the service finishes, but POS checkout happens later. Today: 26 completed appointments, but only 2 clients have POS transactions ($257.31). The hook looks up POS data for completed clients — if no POS record exists yet, their revenue contribution is $0. This creates a $2,467 gap.

### Issue 3: "Still expected to collect" only shows booked/pending
`pendingExpectedRevenue` only counts appointments with status `booked/confirmed/arrived/started/pending/in_progress`. The 24 completed-without-checkout appointments fall through the cracks — they're "resolved" (so not pending) but have no POS data (so contribute ~$0 to actuals).

## Fix Plan

### File: `src/hooks/useAdjustedExpectedRevenue.ts`

**Change 1: Subtract tips from originalExpected**
Line 65: Change from summing `total_price` to summing `total_price - tip_amount`.

**Change 2: Add a "completed but not checked out" category**
After fetching POS data for completed appointments, compare each completed appointment's scheduled price against whether POS data was found for that client. If a completed appointment's client has no POS transactions, count its scheduled price as "awaiting checkout" revenue rather than $0.

Add new fields to `AdjustedExpectedResult`:
- `awaitingCheckoutCount: number`
- `awaitingCheckoutRevenue: number`

**Change 3: Include awaiting-checkout in adjusted expected**
```
adjustedExpected = completedActualRevenue + awaitingCheckoutRevenue + pendingExpectedRevenue
```

**Change 4: Subtract tips from pending/completed scheduled sums**
All intermediate sums (`pendingScheduledRevenue`, `completedScheduledRevenue`) should use `total_price - tip_amount`.

### File: `src/components/dashboard/AggregateSalesCard.tsx`

**Change 5: Update "still expected to collect"**
`remainingExpected` should include both pending appointments AND awaiting-checkout appointments:
```
remainingExpected = pendingExpectedRevenue + awaitingCheckoutRevenue
```

**Change 6: Update appointment completion fraction**
Add awaiting-checkout context: e.g., "26 of 42 completed · 16 pending · 24 awaiting checkout"

## Expected Result After Fix

| Metric | Before | After |
|--------|--------|-------|
| Scheduled Services Today | $5,219 (inc tips) | $5,143 (ex tips) |
| Still expected to collect | $2,495 (pending only) | ~$4,886 (pending + awaiting checkout) |
| Projected finish | $2,752 | $5,143 (realistic) |

## Summary

| Type | Count |
|------|-------|
| Modified files | 2 |
| New fields added | 2 (`awaitingCheckoutCount`, `awaitingCheckoutRevenue`) |
| Root causes fixed | 3 (tips inclusion, checkout gap, pending-only scope) |

