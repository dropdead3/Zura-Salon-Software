

## Explain the "Unexplained Gap" — Appointment-Level Pricing Variance

### What you're asking for

You want the "Pricing / discounts / other" row in the gap breakdown to be expandable — just like cancellations and no-shows — showing exactly which completed appointments had a difference between what was scheduled and what was actually collected. This reveals markdowns, service swaps, discounts, and uncollected appointments.

### Data reality

- `phorest_transaction_items.appointment_id` is always null in your data, so we can't do a direct 1:1 join
- We **can** match via `phorest_client_id` + `appointment_date` (client + day)
- Clients with multiple same-day appointments create ambiguity, so we aggregate at the **client-day** level: total scheduled vs total POS collected per client per day
- This shows which client visits had a revenue shortfall and by how much

### Plan

#### 1. Expand `useRevenueGapAnalysis` hook

Add a new query that fetches **completed appointments** with their scheduled prices, then fetches matching **POS transaction items** for those same client-days. Compares per-client-day totals:

- `scheduledTotal` = sum of `phorest_appointments.total_price` for that client-day
- `actualTotal` = sum of `phorest_transaction_items.total_amount` for that client-day
- `variance` = scheduled - actual (only surface where variance > $1)

New return field:
```typescript
pricingVariances: {
  count: number;
  totalVariance: number;
  items: PricingVarianceItem[];
}

interface PricingVarianceItem {
  clientName: string | null;
  scheduledServices: string[];   // service names from appointments
  actualServices: string[];      // item names from transactions
  scheduledAmount: number;
  actualAmount: number;
  variance: number;
  appointmentDate: string;
  stylistName: string | null;
  hasDiscount: boolean;
  noTransaction: boolean;        // true if zero POS records found
}
```

Items sorted by variance descending (largest shortfalls first).

#### 2. Update `RevenueGapDrilldown` component

Replace the static "Pricing / discounts / other" div with an `ExpandableRow` that shows the variance items when clicked:

- Each row shows: **Client name**, **Scheduled services** vs **Actual services** (if different), **Scheduled amount** → **Actual amount**, **Variance**
- Flag rows where no POS transaction was found at all ("No transaction recorded")
- Flag rows where services differ from scheduled ("Service changed")
- Flag rows with discounts applied
- Same 5-item cap with "Show all" toggle

#### 3. Files modified

| File | Change |
|---|---|
| `src/hooks/useRevenueGapAnalysis.ts` | Add pricing variance query (completed appts vs POS transactions by client-day), new `pricingVariances` return field |
| `src/components/dashboard/sales/RevenueGapDrilldown.tsx` | Make "Pricing / discounts / other" row expandable with variance detail list, new `VarianceList` sub-component |

### Technical details

- Client-day matching: group by `phorest_client_id` + `appointment_date` to avoid cross-join inflation
- Only surface variances > $1 to filter rounding noise
- Staff name resolution reuses the existing `phorest_staff_mapping` lookup already in the hook
- Transaction query filters to `item_type IN ('service', 'sale_fee')` to match service revenue (excludes retail products which aren't part of appointment estimates)
- The `unexplainedGap` number becomes `max(0, gapAmount - cancellations - noShows - pricingVariances.totalVariance)` — any remaining gap after all three categories

