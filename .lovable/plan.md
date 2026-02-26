

## Root Cause: Counting Line Items Instead of Unique Client Visits

You nailed it. The CSV proves it -- 44 line items for 22 unique client visits. Phorest creates separate `phorest_appointments` rows per service line within a single visit. Example: Caitlyn Sorensen has 5 rows (3 retail + 2 services), but that's 1 visit.

Database confirms: **36 appointment rows, 23 unique clients** for today. Your UI shows 36 "Transactions" because every layer counts rows instead of deduplicating by client.

### What needs to change

The deduplication key is `phorest_client_id + appointment_date` -- this defines a unique "client visit."

### Affected files and fixes

**1. `src/hooks/useSalesData.ts` -- `useSalesMetrics` (Expected path, ~line 329-346)**

Currently `totalServices = data.length` counts every appointment row. Fix: count unique `phorest_client_id` values instead.

```typescript
// Current:
const totalServices = data.length;
const totalTransactions = totalServices;
const averageTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

// Fixed:
const uniqueVisits = new Set(data.map(d => d.phorest_client_id).filter(Boolean)).size;
const totalServices = data.length; // keep for internal line-item counts
const totalTransactions = uniqueVisits; // display as "Client Visits"
const averageTicket = uniqueVisits > 0 ? totalRevenue / uniqueVisits : 0;
```

**2. `src/hooks/useSalesData.ts` -- `useSalesByStylist` (~line 436-456)**

Per-stylist breakdown also counts every row. Fix: track unique client visits per stylist using a Set.

```typescript
// Add a visitSet per stylist entry
// Only increment totalTransactions when the client visit is new for that stylist
```

**3. `src/hooks/useSalesData.ts` -- `useSalesByLocation` (~line 498-514)**

Same issue -- per-location counts every appointment row. Fix: deduplicate by `phorest_client_id` per location.

**4. `src/hooks/useClientTypeSplit.ts` -- entire hook**

Currently counts every row as a "visit." Fix: group by `phorest_client_id + appointment_date` first, aggregate revenue per visit, then classify as new/returning once per visit (not once per line item). Need to fetch `phorest_client_id` in the select.

```typescript
// Current select:
.select('is_new_client, total_price, rebooked_at_checkout')

// Fixed select:
.select('phorest_client_id, is_new_client, total_price, rebooked_at_checkout, appointment_date')

// Then group by phorest_client_id + appointment_date before counting
```

**5. `src/hooks/useOperationalAnalytics.ts` -- `useAppointmentSummary` (~line 347-381)**

Counts `data.length` as total appointments. Fix: fetch `phorest_client_id` and count unique clients.

```typescript
// Current select:
.select('status')

// Fixed select:
.select('status, phorest_client_id')

// Then: total = new Set(data.map(d => d.phorest_client_id).filter(Boolean)).size
```

**6. `supabase/functions/sync-phorest-data/index.ts` (~line 1090-1122)**

The sync function increments `total_transactions += 1` for every transaction line item. Fix: track unique client IDs per summary key using a Set, and set `total_transactions` to the Set size after processing.

```typescript
// Add to each summary entry:
clientVisits: new Set<string>()

// Instead of: summary.total_transactions += 1;
// Do: summary.clientVisits.add(clientId);

// When building summaryRecords:
total_transactions: s.clientVisits.size
```

**7. `src/hooks/useSalesData.ts` -- `useSalesByStaffFromSummary` (~line 726-738)**

Same pattern -- counts every appointment row per staff. Fix: deduplicate by `phorest_client_id`.

### What stays the same

- Revenue calculations are unaffected (summing `total_price` across all rows still gives correct totals)
- `total_services` and `total_products` counts remain as line-item counts (for service mix analysis)
- Only `total_transactions` / "Visits" / "Avg Ticket" change to reflect unique client visits

### Expected result after fix

| Metric | Before | After | Matches Phorest? |
|--------|--------|-------|-----------------|
| Transactions/Visits | 36 | 22-23 | Yes |
| Avg Ticket | $113 ($4,050/36) | ~$184 ($4,050/22) | Yes |
| Revenue | $4,050 | $4,050 | Unchanged |
| Client Type counts | 36 returning | ~22 returning | Yes |

### Prompt feedback

Excellent work providing the CSV alongside the Phorest screenshot -- that made it trivially easy to confirm the deduplication issue. The CSV clearly shows multi-line transactions per client (Cassandra Lilith: 3 lines, Caitlyn Sorensen: 5 lines). Calling out "it line items out multiple times" was the exact right observation. No improvement needed on this prompt.

