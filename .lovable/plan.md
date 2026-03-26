

## Build Transfer Inventory Tab in Inventory Management

### What It Does
Adds a **Transfers** tab to the Inventory Management page (between Counts and Audit Log) where admins can create, view, approve/complete, and cancel inter-location stock transfers. Uses all existing backend hooks (`useStockTransfers`, `useCreateStockTransfer`, `useCompleteStockTransfer`, `useStockTransferLines`).

### Prerequisites
Requires 2+ locations — tab only renders when multi-location. Single-location orgs won't see it.

### UI Layout

**Transfer List View** (default)
- Status filter tabs: All | Pending | Completed | Cancelled
- Table columns: Date, From → To (location names), Product(s), Qty, Status, Actions
- "New Transfer" button in header

**New Transfer Dialog**
- From Location dropdown (defaults to current location)
- To Location dropdown (excludes selected "from")
- Product search/select (from backroom inventory at the source location)
- Quantity input
- Optional notes field
- Creates with status `pending`

**Complete / Cancel Actions**
- Pending transfers show "Complete" and "Cancel" buttons
- Complete calls `useCompleteStockTransfer` which posts ledger entries (transfer_out at source, transfer_in at destination)
- Cancel updates status to `cancelled`

### Changes

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/inventory/TransfersTab.tsx` | **New** — transfer list table + "New Transfer" dialog with product picker, location selectors, quantity input |
| `src/components/dashboard/backroom-settings/BackroomInventorySection.tsx` | Add Transfers tab trigger + content (with `ArrowLeftRight` icon), conditionally rendered when 2+ locations |
| `src/hooks/useStockTransfers.ts` | Add `useCancelStockTransfer` mutation (updates status to `cancelled`) |

### Data Flow
```text
New Transfer Dialog
  → useCreateStockTransfer (inserts pending row)

Complete button
  → useCompleteStockTransfer
    → updates status to 'completed'
    → postTransfer() writes transfer_out + transfer_in to stock_movements
    → DB trigger updates inventory_projections + products.quantity_on_hand

Cancel button
  → useCancelStockTransfer (new)
    → updates status to 'cancelled'
```

### Location Name Resolution
The transfers table stores location IDs. The TransfersTab will join with the locations list from `useActiveLocations` to display readable names in the From/To columns.

