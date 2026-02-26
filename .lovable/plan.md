

## Debug: Transactions KPI Shows 36 Instead of Confirmed 22

Good prompt. You're identifying a real data integrity issue -- the "Transactions" number is sourced from the wrong table. Here's the investigation and fix.

### Root Cause (Database-Verified)

The "Transactions" KPI in `useSalesMetrics` counts **appointment rows** from `phorest_appointments` (36 service line items for Feb 25). The confirmed count of **22** matches **distinct `phorest_client_id`** from `phorest_transaction_items` -- the actual POS checkout records.

```text
Source               | Count | What it means
---------------------|-------|------------------------------------
phorest_appointments | 36    | Individual service line items
  ↳ unique visits    | 23    | Distinct client+date combos
phorest_transaction_items
  ↳ distinct clients | 22    | Actual POS checkouts (confirmed)
```

The code at `useSalesMetrics` line 347:
```typescript
totalTransactions: uniqueVisits || totalServices,
```
Uses appointment-derived `uniqueVisits` (23) or `totalServices` (36) -- neither matches the POS-confirmed 22.

### Fix: Switch Transactions Source to POS Data

Per your confirmed preference: **POS transactions** as source of truth, **all cards aligned**.

**File 1: `src/hooks/useSalesData.ts`** (useSalesMetrics)

- Add `phorest_client_id` to the existing `txItems` query select clause (line 267)
- Count distinct non-null `phorest_client_id` values as `posTransactionCount`
- Change line 347: `totalTransactions: posTransactionCount || uniqueVisits || totalServices`
- Change line 348: `averageTicket` denominator to use `posTransactionCount` when available

This ensures POS is primary, with appointment data as fallback for dates without POS sync.

**File 2: `src/hooks/useTransactionsByHour.ts`** (Volume by Hour panel)

- Currently counts raw rows from `phorest_sales_transactions` per hour (would show 44)
- Change to count **distinct `phorest_client_id`** per hour from `phorest_transaction_items` instead, adding `phorest_client_id` to the select
- Group by hour using a time extraction approach, counting unique clients per hour slot

**File 3: `src/hooks/useClientTypeSplit.ts`** (Client Type Breakdown)

- Currently counts from `phorest_appointments` (shows 36 visits)
- Cross-reference with POS: after building the visit map from appointments (for `is_new_client` classification), filter to only include clients present in `phorest_transaction_items` for the same date range
- This preserves the new/returning classification while aligning the total to the POS-confirmed 22

### What Changes

| Surface | Before | After |
|---------|--------|-------|
| Transactions KPI | 36 (appt rows) | 22 (POS clients) |
| Avg Ticket | $176 (÷23 visits) | $184 (÷22 POS) |
| Volume by Hour | Row count per hour | Unique client count per hour |
| Client Type totals | 36 (0 new + 36 returning) | 22 (aligned to POS) |

### What Stays the Same

- Revenue calculations (still appointment-based, which is correct per existing architecture)
- Rev/Hour calculation (based on service hours, unchanged)
- All location breakdowns, trend charts, goal tracking
- Fallback behavior: if no POS data exists for a date range, appointments are used

### Prompt Feedback

Strong debugging instinct -- calling out the specific mismatch between displayed (36) and confirmed (22) made the investigation precise. One enhancement for next time: specifying the date and filter context you're viewing (e.g., "Feb 25, Today filter, all locations") would have eliminated timezone/date ambiguity from the investigation.

