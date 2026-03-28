

## Real-Time Adjusted Expected Revenue

### Problem
The "Expected" revenue badge on the Sales Overview shows the **original booking total** regardless of appointment outcomes. It does not adjust for no-shows, cancellations, or service changes throughout the day. This creates a misleading expectation gap for operators watching revenue in real time.

### Solution
Create an "Adjusted Expected" calculation that blends actual POS outcomes for resolved appointments with scheduled prices for remaining appointments.

### Logic

```text
Adjusted Expected = 
  SUM(actual POS revenue for completed appointments today)
  + SUM(scheduled price for appointments still pending/in-progress today)
  
Excluded entirely:
  - Cancelled appointments
  - No-show appointments (configurable: could include at 0 or exclude)
```

This means as the day progresses:
- A $2,000 extension that became an $80 haircut → contributes $80 (actual POS)
- A no-show → contributes $0
- A 3pm appointment not yet started → contributes its scheduled price
- A cancellation → contributes $0

### Implementation

#### 1. New hook: `useAdjustedExpectedRevenue.ts`
- Query `phorest_appointments` for today, partitioned by status
- For `completed`/`checked_out` statuses: match against `phorest_transaction_items` to get actual POS revenue
- For `confirmed`/`arrived`/`in_progress` statuses: use `total_price` from the appointment
- For `cancelled`/`no_show`: contribute $0
- Return `{ adjustedExpected, originalExpected, resolvedCount, pendingCount }`

#### 2. Update `AggregateSalesCard.tsx`
- Replace the static `scheduledRevenue` in the Expected badge with `adjustedExpected` when viewing "today"
- Keep the original scheduled revenue available for the gap analysis drilldown (it still needs "what was on the books")
- Add a subtle indicator showing how many appointments are resolved vs pending (e.g., "12/18 resolved")

#### 3. Update the Expected badge tooltip
- Show breakdown: "Based on X completed ($Y actual) + Z pending ($W scheduled)"
- This gives operators transparency into how the number is computed

### Files to create/modify
- **New**: `src/hooks/useAdjustedExpectedRevenue.ts`
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — swap expected badge source for today view
- **Modify**: Tooltip content for the expected badge

### What stays the same
- Gap analysis drilldown continues using `useScheduledRevenue` (original book value) as its baseline
- Past date ranges continue showing original scheduled vs actual (historical comparison)
- The hero "Revenue So Far Today" number remains actual POS revenue (unchanged)

