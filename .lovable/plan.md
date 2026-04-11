

# Fix Vish Product Charges — Reclassify as Service Revenue

## Problem

Phorest records Vish chemical charges in two ways:
- `item_name: 'Vish'`, `item_type: 'sale_fee'` (324 rows) — already correctly treated as service revenue everywhere
- `item_name: 'Vish Product Charge'`, `item_type: 'product'` (14 rows) — **incorrectly categorized as retail product revenue**

These are service overage fees (chemical cost pass-throughs), not retail sales. They inflate retail metrics, retail attachment rates, and "Products by Stylist" numbers while deflating service revenue.

## Approach

Create a single `isVishServiceCharge()` utility in `serviceCategorization.ts` and apply it consistently across every file that splits service vs product revenue.

The pattern: `item_name` matches `/vish/i` AND `item_type` is `product` → treat as service revenue, exclude from retail.

---

## Technical Changes

### 1. New utility in `src/utils/serviceCategorization.ts`

Add `isVishServiceCharge(itemName, itemType)` — returns true when the item is a Vish chemical fee masquerading as a product. Pattern: `/\bvish\b/i` on item_name when item_type is `product`.

### 2. Files that need the Vish filter (10 files)

| File | Current behavior | Fix |
|---|---|---|
| `useRetailBreakdown.ts` | Vish Product Charge lands in generic product bucket | Add early-continue for `isVishServiceCharge` before category checks |
| `useRetailCategoryItems.ts` | Fetches non-service items, Vish included | Skip items matching `isVishServiceCharge` in the loop |
| `useServiceProductDrilldown.ts` | Queries `item_type IN (product)`, Vish included in "Products by Stylist" | Filter out Vish items from productItems before aggregation |
| `useRetailAttachmentRate.ts` | Vish counts as a retail "attachment" | Filter out Vish from productItems alongside extension filter |
| `useServiceRetailAttachment.ts` | Same attachment inflation | Filter out Vish alongside extension filter |
| `useExtensionProductRevenue.ts` | Vish could land in "other product" if not extension | Filter out Vish before counting |
| `useAppointmentTransactionBreakdown.ts` | `categorize()` sends `item_type=product` to 'product' bucket | Check item_name for Vish, return 'fee' instead of 'product' |
| `useSalesData.ts` | Only `service` and `sale_fee` count as service revenue | Add Vish product check to service revenue accumulator |
| `useBatchReportGenerator.ts` | `item_type !== 'service'` → productRev | Check for Vish, add to serviceRev instead |
| `useStylistExperienceScore.ts` | Vish counted as retail for experience scoring | Filter out Vish from retail accumulator |

### 3. Hooks that already handle it correctly (no changes needed)

- `useActualRevenue.ts` — uses `SERVICE_TYPES` set with `sale_fee` (the 324 `sale_fee` rows are fine; the 14 `product` rows aren't fetched here because it queries a view)
- `useTodayActualRevenue.tsx` — same pattern
- `useRevenueGapAnalysis.ts` — queries `item_type IN ['service', 'sale_fee']` only

### 4. Summary of impact

- Retail revenue decreases by the Vish Product Charge total (~$278 based on 14 items at ~$19.87 avg)
- Service revenue increases by the same amount
- Retail attachment rate drops slightly (fewer false "product" visits)
- "Products by Stylist" drilldown no longer shows Vish charges
- Batch reports correctly attribute Vish to service column

Total: 1 new utility function, 10 files updated with a one-line filter each.

