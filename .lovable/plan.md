

# Fix: Revenue Breakdown Doesn't Add Up — Missing Item Types

## Root Cause

The database has **6 distinct `item_type` values**, but the Services/Retail tiles only account for 2:

| item_type | Total Revenue | Currently Counted In |
|---|---|---|
| `service` | $3,151.00 (today) | Services tile ✓ |
| `product` | $168.95 (today) | Retail tile ✓ |
| `sale_fee` (Vish charges) | $120.75 (today) | **Hero only — invisible to tiles** |
| `special_offer_item` | — | **Hero only — invisible to tiles** |
| `appointment_deposit` | — | **Hero only — invisible to tiles** |
| `outstanding_balance_pmt` | — | **Hero only — invisible to tiles** |

The **hero** (via `useActualRevenue`) uses an `if service → else everything else` pattern, so it correctly sums $3,440.70. But the **Retail tile** (via `useRetailBreakdown`) hardcodes `item_type IN ('product', 'Product', 'retail', 'Retail')`, missing 4 types worth **$4,806.79 historically**.

## Fix Strategy

Categorize the 6 item types properly:

- **Service-adjacent** (add to Services tile): `sale_fee` (Vish chemical charges are service costs), `special_offer_item` (promotional service packages)
- **Financial** (add as "Other" in Retail or separate): `appointment_deposit`, `outstanding_balance_pmt`

Since `sale_fee` items are Vish (color bar chemical pass-through charges billed to clients) and `special_offer_item` are promotional service bundles, they belong with Services revenue. Deposits and balance payments are financial items that should appear in the retail/other bucket so the total still reconciles.

## Implementation

### Task 1 — Fix `useRetailBreakdown.ts` to include financial item types
Add `sale_fee`, `special_offer_item`, `appointment_deposit`, `outstanding_balance_pmt` to the query filter. Categorize deposits and balance payments as an "Other" sub-category.

Actually, the cleaner approach: **query all non-service items** instead of hardcoding product types. Change the filter from `IN ('product',...)` to `NOT IN ('service', 'Service', 'SERVICE')` — this future-proofs against new item types.

### Task 2 — Fix `useActualRevenue.ts` and `useTodayActualRevenue.tsx` service categorization
Currently `sale_fee` and `special_offer_item` are lumped into product revenue. Since `sale_fee` (Vish) and `special_offer_item` (promo bundles) are service-adjacent, update the categorization:
- Service: `service`, `sale_fee`, `special_offer_item`
- Product/Other: `product`, `appointment_deposit`, `outstanding_balance_pmt`, and any future unknowns

This ensures:
- Hero total stays the same ($3,440.70) ✓
- Services tile: $3,151.00 + $120.75 = $3,271.75 (Vish charges now included)
- Retail tile: $168.95 (products only — deposits/balance pmts are negligible today)
- Services + Retail = Hero total ✓

### Task 3 — Add "Fees & Deposits" sub-category to retail breakdown
In `useRetailBreakdown.ts`, add categorization for `appointment_deposit` and `outstanding_balance_pmt` so they appear as a visible "Fees & Deposits" line in the retail breakdown, not silently absorbed.

### Task 4 — Update `RetailBreakdownData` interface and display
Add `feesRevenue` / `feesCount` to the interface and display it in the retail breakdown expansion in `AggregateSalesCard.tsx`.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useActualRevenue.ts` | Categorize `sale_fee` + `special_offer_item` as service revenue |
| `src/hooks/useTodayActualRevenue.tsx` | Same categorization fix (2 spots: aggregate + per-location) |
| `src/hooks/useRetailBreakdown.ts` | Query all non-service items; add fees/deposits sub-category |
| `src/components/dashboard/AggregateSalesCard.tsx` | Display "Fees & Deposits" in retail breakdown |

No database changes. 4 files edited.

