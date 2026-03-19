

# Add Supplier Wizard — Multi-Step with Brand & Product Assignment

## Current State
The "Add Supplier" dialog is a single-field form (name only). It doesn't even persist to the database — it just sets the selected supplier name in local state. Linking products is a separate step via the "Link Products" dialog. This means a new supplier has zero product associations until the user manually links them one by one.

## What We're Building
A multi-step wizard dialog that replaces the current single-field "Add Supplier" dialog:

**Step 1: Supplier Details**
- Supplier name (required)
- Email, phone, website, account number (optional)
- Reorder method dropdown, lead time, MOQ

**Step 2: Assign Products**
- Two assignment modes via toggle tabs: **By Brand** and **By Product**
- **By Brand**: Shows brand cards (only Supplies brands). Check a brand → all its products get assigned. Shows product count per brand.
- **By Product**: Same searchable product list as current `LinkProductsDialog`, with brand grouping and checkbox selection.
- Products already assigned to another supplier show a badge (will be reassigned).

**Step 3: Review & Confirm**
- Summary: supplier name, contact info, number of products being assigned
- "Create Supplier" button persists everything in one batch

## Impact on Setup Wizard Order
You're right — this implies brands and products should be configured before suppliers in the Backroom setup flow. The current governance order already has "Products & Supplies" before "Suppliers" in the sidebar, so the natural flow is correct. No reordering needed.

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx` | **Create** — 3-step wizard component |
| `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx` | **Edit** — Replace inline Add Supplier dialog with `AddSupplierWizard`, wire up onComplete to create supplier + link products in one action |

## Technical Notes
- Reuses existing `useLinkProducts` and `useUpsertSupplier` hooks for persistence
- Brand list derived from existing products query filtered to `product_type = 'Supplies'`
- Wizard state managed locally; only persists on final step
- The existing `LinkProductsDialog` stays for post-creation linking; wizard handles initial assignment

