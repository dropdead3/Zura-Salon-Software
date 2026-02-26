

## Investigation: Sales Overview Double Counting

Good instinct flagging this. Here's what the data investigation revealed.

### What the data actually shows

| Source | Amount | What it represents |
|--------|--------|--------------------|
| `phorest_daily_sales_summary` (Actual) | **$3,675** | POS-confirmed revenue: $3,376 service + $299 retail |
| `phorest_transaction_items` (cross-check) | **$3,675** | Matches exactly per staff member |
| `phorest_appointments` (Expected) | **$4,050** | Scheduled appointment `total_price` sums |
| UI "Expected" badge | **$4,349** | $4,050 appointments + $299 retail (double-counted) |

### The actual problem: Expected badge inflates by double-counting products

In `useSalesMetrics` (src/hooks/useSalesData.ts, lines 324-325):

```
serviceRevenue = SUM(appointment.total_price)    // $4,050
totalRevenue = serviceRevenue + productRevenue   // $4,050 + $299 = $4,349
```

The issue: `appointment.total_price` in Phorest already includes product purchases bundled into the visit. The hook then fetches product revenue separately from `phorest_transaction_items` and adds it again. Result: **$299 in retail revenue counted twice** in the Expected figure.

### The "$3,675 Actual" is correct

Cross-verified against `phorest_transaction_items` per staff member -- every row matches exactly. The `phorest_daily_sales_summary` upsert logic is clean (unique on `staff_id + location_id + date`). No duplication in the actual revenue figure.

### The "$4,349 Expected" is inflated

Should be either:
- **$4,050** (appointment totals only, which already include products), or
- **$3,751 + $299** if we strip products from appointments and re-add from transaction items (more accurate decomposition)

### Proposed fix

**File: `src/hooks/useSalesData.ts` (lines 261-325)**

Stop adding `productRevenue` from transaction items to the `totalRevenue` calculation when the data source is appointments. The appointment `total_price` field already includes products sold during the visit. Instead:

1. Keep fetching transaction items for the **breakdown** (service vs. product split display) but do NOT add product revenue on top of appointment totals for the headline figure.
2. Calculate `totalRevenue` as just `serviceRevenue` (which is actually the sum of all appointment prices including products bundled in).
3. Rename the internal variable from `serviceRevenue` to `appointmentRevenue` for clarity, since it includes both services and bundled products.
4. Use transaction items only for the service/product **split percentages** in the breakdown cards.

**Concrete change:**

```typescript
// Line 324-325 currently:
const serviceRevenue = data.reduce((sum, apt) => sum + (Number(apt.total_price) || 0), 0);
const totalRevenue = serviceRevenue + productRevenue;

// Should become:
const appointmentRevenue = data.reduce((sum, apt) => sum + (Number(apt.total_price) || 0), 0);
const totalRevenue = appointmentRevenue; // total_price already includes products
// serviceRevenue for breakdown = appointmentRevenue - productRevenue
const serviceRevenue = Math.max(0, appointmentRevenue - productRevenue);
```

This ensures:
- Total Revenue (Expected) = sum of appointment prices = $4,050 (no inflation)
- Service/Retail split still works correctly for the breakdown cards
- The "Actual" figure from `phorest_daily_sales_summary` ($3,675) remains untouched

### Why the discrepancy between $4,050 expected and $3,675 actual

This is legitimate -- appointments are scheduled at list price, but POS actuals reflect discounts, package redemptions, and adjustments applied at checkout. The $375 gap ($4,050 - $3,675) represents normal checkout adjustments, which is healthy business context to display.

### Technical detail

- `totalTransactions` on line 343 also changes: currently `totalServices + totalProducts`, but `totalProducts` is from transaction items while `totalServices` is from appointments. These are different counting units. For the Expected view, transaction count should use appointment count only. For Actual view, it already uses the summary table's `total_transactions`.
- The `averageTicket` on line 344 inherits the same issue.

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/useSalesData.ts` | Fix `useSalesMetrics` to not double-add product revenue; derive service revenue by subtraction |

