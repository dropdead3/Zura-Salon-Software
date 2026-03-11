

## Wire Extension Exclusion Into All Attachment Rate Calculations

### Problem
Only `useRetailAttachmentRate` was updated to exclude extensions. Three other hooks still count extension products in their attachment rates, creating inconsistency across the app.

### Changes

**1. `src/hooks/useRetailAnalytics.ts`** — Retail Analytics tab attachment rate

- Import `isExtensionProduct` from `@/utils/serviceCategorization`
- In the `processItem` function (~line 344), when tracking product transactions for attachment rate (`allProductTxs.add(txId)`), skip items where `isExtensionProduct(item.item_name)` is true
- Similarly in the per-staff tracking (~line 356), skip adding to `s.productTxs` for extension items
- This affects both the global attachment rate KPI and per-staff attachment rates
- Update the tooltip on line 653 to mention exclusion of extensions

**2. `src/hooks/useServiceRetailAttachment.ts`** — Service-level retail attachment

- Import `isExtensionProduct`
- Add `item_name` to the product items select query (~line 65)
- Filter out extension products before building the `productVisitMap` (~line 76): skip items where `isExtensionProduct(p.item_name)`
- Update tooltip in the component that consumes this hook if applicable

**3. `src/hooks/useIndividualStaffReport.ts`** — Individual staff report attachment rate

- Import `isExtensionProduct`
- In the loop (~line 344), when checking `isProduct`, also check `!isExtensionProduct(item.item_name)` before adding to `productVisitKeys`
- This ensures the per-stylist attachment rate in their individual report excludes extensions

**4. `src/components/dashboard/analytics/RetailAnalyticsContent.tsx`** — Update tooltip text

- Line 653: Update Attachment Rate tooltip to say "excludes extensions" to match the new calculation

### Summary
All four attachment rate calculations will consistently exclude extension products, matching what was already done in `useRetailAttachmentRate`. No UI layout changes — just data accuracy and tooltip clarity.

