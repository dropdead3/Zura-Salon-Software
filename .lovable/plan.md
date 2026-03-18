

## Backroom Inventory Management System

### Current State

The "Inventory" section in the Backroom Hub is currently just a **configuration page** (`InventoryReplenishmentSection`) with toggles for tracking, reorder cycles, lead times, and alerts. There's also an "inventory view" toggle inside the Product Catalog that shows a basic stock table with inline editing. 

The backend infrastructure is already robust: `stock_movements` ledger, `inventory_projections`, `purchase_orders` + `purchase_order_lines`, `count_sessions`, `stock_counts`, `replenishment_recommendations`, `product_suppliers`, receive shipment flows, and stockout forecasting. But none of this is surfaced in a cohesive operational UI.

The Vish screenshot shows a flat, spreadsheet-like approach — no workflow structure, no receiving, no count sessions, no purchasing pipeline. We can do much better.

### Architecture

Replace the current `InventoryReplenishmentSection` with a full **Backroom Inventory Management** section built as a tabbed workspace with 5 sub-views:

```text
┌──────────────────────────────────────────────────────┐
│  Inventory                          [Location ▾]     │
│                                                      │
│  ┌─────────┬──────────┬────────┬──────────┬────────┐ │
│  │ Stock   │ Reorder  │ Orders │ Receive  │ Counts │ │
│  └─────────┴──────────┴────────┴──────────┴────────┘ │
│                                                      │
│  [Tab Content Area]                                  │
└──────────────────────────────────────────────────────┘
```

### Tab 1: Stock Overview (default)

**KPI Row** (4 cards, clickable to filter):
- Total On Hand (units) | Low Stock (count) | Out of Stock (count) | Inventory Value ($)

**Stock Table** — The primary inventory grid, similar to the existing `InventoryView` but enhanced:
- Columns: Product (name + brand), Category, Container, Stock, Min, Max, Order Qty, Status, Cost/g
- Inline editable: Stock (posts ledger entry), Min, Max
- Sortable columns, search bar, category filter
- Status badges: In Stock, Replenish, Urgent Reorder, Out of Stock
- Brand grouping headers (group rows by brand with sticky sub-headers)
- Move current `InventoryView` component logic here

### Tab 2: Reorder

**Smart reorder queue** using existing `useReplenishmentRecommendations`:
- Products below reorder point, sorted by urgency
- Each row shows: Product, Current Stock, Reorder Point, Par Level, Recommended Qty (editable), Supplier, Est. Cost
- Stockout forecast date (from `forecastStockout`) shown as "X days left" with urgency color
- Bulk actions: "Create Draft POs" groups by supplier and creates purchase orders
- AI reorder suggestion integration (existing `useReorderSuggestion`)
- Settings sub-panel: reorder cycle, lead time, forecast participation (move config from current section here)

### Tab 3: Purchase Orders

**PO lifecycle management** using existing `usePurchaseOrders`:
- Status filter tabs: All | Draft | Sent | Received | Cancelled
- PO list with: PO #, Supplier, Items, Total Cost, Status, Created, Expected Delivery
- Click to expand: line items, notes, tracking
- Actions: Send to Supplier (email), Mark Received (opens Receive tab), Cancel
- "New Purchase Order" button — manual PO creation form

### Tab 4: Receive

**Shipment receiving workflow** using existing `useReceiveShipment`:
- List of POs with status "sent" or partially received
- Click a PO to open receiving form: line-by-line quantity acceptance
- Support partial receives (accept 8 of 10 units)
- On complete: auto-posts ledger entries, updates stock, tracks supplier delivery time
- Receiving history log

### Tab 5: Counts

**Physical count session management** using existing `useCountSessions` + `useStockCounts`:
- "Start New Count" button — creates a count session, optionally scoped to location
- Active count: checklist of tracked products with expected vs. counted fields
- Variance summary after completion: total units off, cost of variance, shrinkage flagging
- Count history table: date, who counted, products counted, total variance
- Shrinkage summary using existing `useShrinkageSummary`

### Implementation Plan

**Phase 1 — New component file + Tab 1 (Stock)**
- Create `BackroomInventorySection.tsx` with tab shell and location selector
- Move and enhance `InventoryView` into Stock tab (add inventory value KPI, brand grouping)
- Wire into `BackroomSettings.tsx` replacing `InventoryReplenishmentSection`

**Phase 2 — Tab 2 (Reorder) + Tab 3 (Orders)**
- Reorder tab: surface `useReplenishmentRecommendations`, stockout forecasts, bulk PO creation
- Orders tab: PO list with status filters, expand/collapse line items, actions

**Phase 3 — Tab 4 (Receive) + Tab 5 (Counts)**
- Receive tab: PO-driven receiving workflow with partial receive support
- Counts tab: count session lifecycle, variance display, shrinkage summary

**Phase 4 — Settings migration**
- Move inventory config (reorder cycle, lead time, thresholds) into a settings gear icon/dialog accessible from the section header, removing the standalone config card

### Files

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/BackroomInventorySection.tsx` | **Create** — New tabbed inventory management component |
| `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` | **Create** — Stock overview table |
| `src/components/dashboard/backroom-settings/inventory/ReorderTab.tsx` | **Create** — Smart reorder queue |
| `src/components/dashboard/backroom-settings/inventory/OrdersTab.tsx` | **Create** — Purchase order management |
| `src/components/dashboard/backroom-settings/inventory/ReceiveTab.tsx` | **Create** — Shipment receiving |
| `src/components/dashboard/backroom-settings/inventory/CountsTab.tsx` | **Create** — Physical count sessions |
| `src/pages/dashboard/admin/BackroomSettings.tsx` | **Edit** — Swap `InventoryReplenishmentSection` for new component |

### Enhancements Over Vish

1. **Workflow-oriented** — Tabs follow the operational lifecycle (monitor → decide to reorder → create PO → receive → count) vs. a flat spreadsheet
2. **Smart reorder queue** — AI-powered suggestions with stockout forecasting, not just a manual "Add to Cart"
3. **Location-scoped** — Per-location stock visibility with the existing location selector pattern
4. **Receiving workflow** — Line-by-line acceptance with partial receive support; Vish has none
5. **Count sessions** — Structured physical counts with variance/shrinkage analysis; Vish just shows a number
6. **Supplier intelligence** — Delivery time tracking, supplier performance built into PO flow
7. **Inventory value** — Total dollar value at cost visible at a glance
8. **Brand grouping** — Products grouped by brand in the stock table for faster scanning
9. **Inline editing** — Click-to-edit stock, min, max without opening a dialog

