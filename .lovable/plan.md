

## Exclude Extensions from Attach Rate

### Problem
The `useRetailAttachmentRate` hook counts **all** product/retail transaction items when determining if a service visit also had a retail purchase. This includes extension products, which inflate the attach rate since they're service inputs, not cross-sells.

### Changes

**1. `src/hooks/useRetailAttachmentRate.ts`** — Filter out extension products from the product items query results

- Import `isExtensionProduct` from `@/utils/serviceCategorization`
- Also select `item_name` alongside `phorest_client_id, transaction_date` in the product items query
- After fetching product items, filter out rows where `isExtensionProduct(row.item_name)` is true before building the `productVisitSet`

**2. `src/components/dashboard/sales/RevenueDonutChart.tsx`** — Fix tooltip text

- Line 179: Update Attach Rate tooltip from `"Percentage of service clients who also purchased a retail product in this period."` to `"Percentage of service clients who also purchased a retail product (excluding extensions) in this period. Extensions are service inputs and not counted as cross-sells."`
- Line 184: Update the inline text from `"purchase retail"` to `"purchase retail (excl. extensions)"`

