

# Additional Gaps and Enhancements

After reviewing the full codebase from the recent changes, here are the gaps I found:

## Issues / Gaps

### 1. `container_size` field not exposed in UI (BUG from last round)
The `container_size` column was added to the DB, and it's read in the PO detail dialog via `(prod as any)?.container_size`. However:
- The **Product Form Dialog** (`ProductFormDialog` in `RetailProductsSettingsContent.tsx`) has no `container_size` input — users can never set it
- The **Products table** doesn't display it
- The `Product` interface in `useProducts.ts` doesn't include it, forcing `as any` casts
- The **Product Wizard** also can't set it

**Fix**: Add `container_size` to the `Product` interface, add an input field in the product edit form, and display it in the inventory table (particularly useful for backroom supply products).

### 2. Inventory KPI cards missing from Products tab
The plan called for 3 KPI summary cards (Current Stock, Products to Reorder, Total Active) at the top of the inventory view. These **were implemented** in `InventoryByLocationTab` (lines 1417-1443 — Total Units, Cost Value, Retail Value, Low Stock). That's good, but the **Products tab** (`ProductsTab`) has no summary cards at all — just a count label. Adding a lightweight summary row there too would give at-a-glance visibility regardless of which tab a user is on.

**Recommendation**: Low priority — the inventory tab covers this. Skip unless user asks.

### 3. No way to CREATE an allowance policy from AllowancesBillingSection
The Allowances section shows existing policies and lets you expand/edit them, but there's **no "Add Policy" button** for creating a new one. The empty state says "Track services first" but even after tracking services, there's no creation flow visible. Policies must already exist in the DB to appear.

**Fix**: Add an "Add Allowance Policy" button that shows a service selector (filtered to tracked services without policies) and creates a new policy with sensible defaults.

### 4. SalonInteractive already existed in `platformIntegrations.ts`
Looking at the config file, it was already added with `coming_soon` status in a prior round. No action needed, but worth confirming it wasn't duplicated.

### 5. `container_size` not in CSV export
The `exportProductsCsv` function (line 87) doesn't include `container_size`. Should be added for completeness.

## Recommended Plan

| Priority | Fix | Effort |
|----------|-----|--------|
| 1 | Add `container_size` to `Product` interface + edit form + inventory table column | Low |
| 2 | Add "Create Policy" flow to AllowancesBillingSection | Medium |
| 3 | Include `container_size` in CSV export | Trivial |

### Implementation Details

**1. Container Size in UI**
- Add `container_size: string | null` to `Product` interface in `useProducts.ts`
- Add input field in `ProductFormDialog` (between SKU/Barcode and Price rows)
- Add `container_size` to the product CSV export
- Remove `as any` casts in `PurchaseOrderDetailDialog.tsx`
- Optionally show in the inventory table as a column (compact, after Brand)

**2. Allowance Policy Creation**
- Add a "New Policy" button in `AllowancesBillingSection` header
- Show a dropdown of tracked services that don't already have a policy
- On select, call `upsertPolicy` with defaults: `included_allowance_qty: 30`, `allowance_unit: 'g'`, `overage_rate: 0.50`, `billing_mode: 'allowance'`
- Expand the new policy after creation so the user can customize

### Files to Modify
- `src/hooks/useProducts.ts` — add `container_size` to interface + insert/update
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — add form field + CSV column
- `src/components/dashboard/settings/inventory/PurchaseOrderDetailDialog.tsx` — remove `as any` casts
- `src/components/dashboard/backroom-settings/AllowancesBillingSection.tsx` — add "New Policy" creation flow

