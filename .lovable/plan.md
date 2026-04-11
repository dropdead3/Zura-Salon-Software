

# Rename Vish Charges to "Chemical Overage Fees" in Revenue by Category

## Problem
In the Revenue by Category drilldown, Vish chemical overage fees appear as "Retail" (when `item_type=product`) or "Other" (when `item_type=sale_fee`). These are service-adjacent costs, not retail sales or miscellaneous items.

## Fix

**File**: `src/hooks/useRevenueByCategoryDrilldown.ts`

In the `allItems.forEach` loop (line 114-150), before the current category assignment logic, add an `isVishServiceCharge` check. When matched, assign the category as `"Chemical Overage Fees"` instead of `"Retail"` or `"Other"`.

Also handle the `sale_fee` Vish items (item_name containing "vish" with item_type `sale_fee`) — these currently land in "Other" and should also map to "Chemical Overage Fees".

Changes:
1. Import `isVishServiceCharge` from `@/utils/serviceCategorization`
2. Replace the category assignment block (lines 116-118) with:
   - If `isVishServiceCharge(item.item_name, item.item_type)` → category = `"Chemical Overage Fees"`
   - If item_name matches `/\bvish\b/i` and item_type is `sale_fee` → category = `"Chemical Overage Fees"`
   - Otherwise keep existing logic (service → `getServiceCategory`, product → `"Retail"`, else → `"Other"`)

**Single file change, ~5 lines modified.**

