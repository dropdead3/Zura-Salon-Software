

## Fix: Date Filter Bug in Adjusted Expected Revenue

### Root Cause
In `useAdjustedExpectedRevenue.ts` line 80, the query uses:
```
.lt('transaction_date', '2026-03-28T23:59:59')
```
Since `transaction_date` is a **date** column (not timestamp), Postgres casts the timestamp string to `2026-03-28`, producing `WHERE transaction_date < '2026-03-28'` — which excludes today entirely. Result: `completedActualRevenue = $0`, creating the false "$3,423 less than booked" message.

### Fix
**File: `src/hooks/useAdjustedExpectedRevenue.ts`** (line 79-80)

Change:
```typescript
.gte('transaction_date', todayStr)
.lt('transaction_date', todayStr + 'T23:59:59')
```
To:
```typescript
.gte('transaction_date', todayStr)
.lte('transaction_date', todayStr)
```

This matches how `useTodayActualRevenue` successfully queries the same table.

### Expected Result After Fix
- **completedActualRevenue** will correctly reflect today's POS total for completed appointment clients (~$1,905.87)
- The tracking line will show the **real** delta between what completed appointments collected vs what they were booked for
- All three metrics (scheduled $3,825 / pending $402 / tracking indicator) will be consistent and accurate

### Files
- `src/hooks/useAdjustedExpectedRevenue.ts` — fix date range filter (1 line change)

