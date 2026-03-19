

# Simplify PO Action Redundancies

## Problem
When products are selected, users see the same actions repeated across multiple UI layers:
- **Selection bar**: "Add Selected to PO", "Auto Build PO", "Create & Email"
- **Actions row**: "Review Items", "Auto Build PO" (duplicate), "Auto-Set Pars", "PO Builder"
- **Supplier group**: "Create PO", "Assign Supplier"

"Auto Build PO" appears twice. "Add Selected to PO" and "PO Builder" overlap. "Create PO" on supplier groups is yet another entry point. It's overwhelming.

## Approach: Context-Aware Action Consolidation

**When nothing is selected** — show the full actions row as-is (Review Items, Auto Build PO, Auto-Set Pars, PO Builder).

**When items are selected** — hide the redundant actions row buttons and let the selection bar be the single action surface. Specifically:

1. **Selection bar** (keep, simplify):
   - "Add to PO" (adds selected to PO Builder) — keep
   - "Auto Build PO" — **remove** from selection bar (it's already in the actions row and isn't selection-specific)
   - "Create & Email" — keep (only shows when email-eligible items exist)
   - Keep: count, est. cost, Clear

2. **Actions row** — always visible, but:
   - "Auto Build PO" — keep here as the single home for this action
   - "Review Items" — keep
   - "Auto-Set Pars" — keep
   - "PO Builder" badge — keep (this is the cart/checkout, distinct from "add to cart")

3. **Supplier group "Create PO"** — **remove**. Users can select products and use "Add to PO" or use "Auto Build PO" which already groups by supplier. The "Assign Supplier" button stays since it's unique functionality.

Net result: "Auto Build PO" appears once. "Create PO" on supplier rows is removed. The selection bar focuses on "Add to PO" + "Create & Email" only.

## Changes

**File: `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`**

1. **Selection bar** (~lines 549-611): Remove the "Auto Build PO" button from the selection bar (lines 575-583)
2. **Supplier group row**: Remove the "Create PO" button — need to check where SupplierSection renders this

**File: SupplierSection component** (likely in same file or CommandCenterRow):
- Remove "Create PO" button from supplier group header, keep "Assign Supplier"

**~2 spots edited in 1-2 files.**

