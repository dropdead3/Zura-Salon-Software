

# Add Suppliers to the Backroom Setup Wizard

## Overview
Insert a "Suppliers" step into the setup wizard after Products (step 2), and add supplier tracking to the setup health metrics and dashboard banner.

## Changes

### 1. `src/hooks/backroom/useBackroomSetupHealth.ts`
- Add a query for distinct `supplier_name` count from `product_suppliers`
- Add `suppliersConfigured: number` to `SetupHealthMetrics`
- Add a warning when no suppliers are configured but tracked products exist

### 2. `src/hooks/backroom/useBackroomDashboard.ts`
- Add `{ label: 'Suppliers', done: h.suppliersConfigured > 0 }` step after Products in the `setupHealth` steps array (line ~105)

### 3. `src/components/dashboard/backroom-settings/BackroomSetupOverview.tsx`
- Add suppliers to the `checklistItems` array after the products entry (line ~54)

### 4. `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`
- Bump `STEP_COUNT` from 5 → 6
- Add supplier state: `supplierName`, `supplierEmail`, `supplierPhone`, `supplierWebsite`, `reorderMethod`, `reorderMethodOther`, `leadTimeDays`, `moq`, `selectedBrandNames` (for by-brand assignment), `selectedSupplierProductIds`
- Insert new step 2 (SuppliersStep) — reuses the same two-tab pattern from `AddSupplierWizard` (By Brand / By Product), plus supplier contact fields
- On `goNext` for step 2: call `useBatchUpsertSupplier` to persist the supplier + product links
- Shift existing steps 2-4 → 3-5; update `stepLabels` to include 'Suppliers'
- Update `isSaving` to include the new mutation

### 5. New `SuppliersStep` component (inside wizard file)
- Supplier name (required), email, phone, website, reorder method (with "other" input), lead time, MOQ
- Two-tab product assignment: By Brand (checkbox brand cards with product counts) and By Product (searchable checkbox list)
- Products query filtered to `product_type = 'Supplies'` and those selected in step 1

## Summary
Six files touched. The wizard gains one new step, the dashboard banner gains one new tracker dot, and the setup overview gains one new checklist item.

