

# Inventory Management System — Gap Analysis and Enhancement Plan

## Current State Summary

The system has six tabs: **Stock**, **Reorder**, **Orders**, **Receive**, **Counts**, and **Audit Log**. It supports location-scoped tracking, inline editing, multi-line PO creation, supplier assignment, PDF/CSV export, auto-par suggestions, and an append-only ledger for audit integrity.

---

## Identified Gaps and Proposed Enhancements

### 1. Stock Tab — Clarity and Discoverability

**Gaps found:**
- Column headers "Min" and "Max" are ambiguous for salon owners who think in terms of "Reorder Point" and "Par Level"
- The dashed-underline inline edit affordance is too subtle — many users won't realize stock, min, and max are editable
- No tooltip explaining what Min, Max, Reorder Qty, or Status mean
- KPI "Total On Hand" counts units across different unit types (tubes, bottles, etc.) which can be misleading
- No "Last Ordered" or "Last Received" date visible per product — forces users to check audit trail
- Brand sections default to open, making long lists overwhelming

**Proposed changes:**
- Rename column headers: "Min" → "Reorder Pt", "Max" → "Par Level" with `MetricInfoTooltip` on each explaining the concept in plain language
- Add a subtle pencil icon or "click to edit" hint on hover for editable cells
- Add `MetricInfoTooltip` to each KPI card explaining what the number represents
- Add a "Last Activity" column (compact date) showing the most recent ledger event per product
- Collapse all brand sections by default when there are more than 5 brands; add "Expand All / Collapse All" toggle
- Add a "Needs Setup" filter or badge for products missing both min and max — guides owners to configure thresholds

### 2. Reorder Tab — Workflow Gaps

**Gaps found:**
- `order_qty` on the ReorderRow uses a hardcoded `0.5` velocity for forecast (`forecastStockout(row.quantity_on_hand, 0.5)`) instead of actual usage data — forecast is unreliable
- No way to edit order quantities before creating POs — users are locked into the computed `order_qty`
- "Generate Suggestions" button is unclear about what it does and when to use it
- "Unassigned" supplier group has no CTA to assign a supplier (unlike the AutoCreatePO dialog which now has this)
- No visual indicator of lead time per supplier — critical for prioritizing orders

**Proposed changes:**
- Make order quantity editable inline (same pattern as Stock tab) so users can adjust before PO creation
- Replace hardcoded velocity with actual `avg_daily_usage` from `inventory_risk_projections` when available
- Add "Assign Supplier" button to the Unassigned group header (same pattern as Stock tab brand headers)
- Show supplier lead time badge next to supplier name in group header
- Rename "Generate Suggestions" to "Refresh AI Recommendations" with a tooltip explaining it re-analyzes usage patterns

### 3. Orders Tab — Missing Features

**Gaps found:**
- PO number displays as a truncated UUID (`po.id.slice(0, 8)`) — not human-friendly
- No ability to edit a draft PO (add/remove lines, change quantities) after creation
- No expected delivery date shown in the main table row
- No confirmation dialog before cancelling a PO — destructive action happens on single click
- "Mark as Sent" has no confirmation — could accidentally mark as sent
- Cannot create a manual PO from the Orders tab — must go through Stock or Reorder

**Proposed changes:**
- Generate sequential PO numbers (e.g., "PO-00042") stored in the database instead of showing UUIDs
- Add an "Edit Draft" action that opens a dialog for modifying line items on draft POs
- Show expected delivery date as a column in the main table
- Add confirmation dialogs for "Mark as Sent" and "Cancel" actions
- Add a "New PO" button in the Orders tab header for manual PO creation
- Add a "Duplicate PO" action for quickly reordering the same items

### 4. Receive Tab — Significant Gaps

**Gaps found:**
- Only shows a single quantity input per PO — does not support line-by-line receiving for multi-line POs
- Uses the legacy single-product `po.quantity` field instead of iterating `purchase_order_lines`
- No way to record discrepancies (damaged, wrong item, short-shipped) with reason codes
- No visual display of what products are in the shipment before clicking "Receive"
- No date picker for actual receipt date (defaults to now) — problems if receiving is logged after the fact

**Proposed changes:**
- Redesign to show all PO line items with individual quantity inputs for each product
- Add reason code dropdown for discrepancies (Short Shipped, Damaged, Wrong Item)
- Show product list preview in each PO card without needing to expand
- Add receipt date picker defaulting to today
- Show a summary badge: "3 of 5 items received" for partial receives
- After receiving, show a success summary with variance notes

### 5. Counts Tab — Usability Issues

**Gaps found:**
- "Start New Count" creates a session but there's no workflow to actually enter counts per product — users must go back to the Stock tab and edit quantities manually
- No ability to select which products to count (full count vs. cycle count)
- Count sessions show metadata but no drill-down into individual product counts
- No way to print a count sheet (PDF) listing products for physical counting
- Shrinkage sub-tab has no date range filter — shows all-time data only

**Proposed changes:**
- Add a count entry workflow: clicking an active session opens a product-by-product count entry form
- Support "Cycle Count" mode where users select specific brands or categories to count
- Add "Print Count Sheet" button that generates a PDF checklist with product names, expected quantities, and blank spaces for actual counts
- Add expandable session rows showing per-product count details
- Add date range filter to the Shrinkage view
- Add a progress indicator to active count sessions (e.g., "12 of 45 products counted")

### 6. Audit Log Tab — Minor Improvements

**Gaps found:**
- "Type" column shows "Stock" vs "Setting" which isn't intuitive — salon owners don't think in these terms
- No quick-filter buttons for common views (e.g., "Today's Changes", "This Week", "Adjustments Only")
- Page size of 50 with no option to change

**Proposed changes:**
- Rename type labels: "Stock" → "Quantity Change", "Setting" → "Level Change"
- Add quick-filter chips: "Today", "This Week", "Adjustments", "Receiving"
- Add page size selector (25, 50, 100)

### 7. Cross-Tab UX Gaps

**Gaps found:**
- No visual connection between tabs — e.g., creating a PO in Reorder doesn't guide user to Orders tab
- No global "inventory health" summary visible across all tabs
- No onboarding guidance for first-time users — the system assumes users understand inventory management concepts
- Tab names alone don't convey workflow order

**Proposed changes:**
- Add toast actions with navigation: "PO created — View in Orders tab →"
- Add a compact "Inventory Health" banner above the tabs showing critical alerts (X out of stock, Y POs awaiting receive)
- Add a first-time setup wizard or contextual help tooltips that explain the workflow: Track Products → Set Levels → Monitor Stock → Reorder → Receive → Count
- Add subtle tab badges showing counts (e.g., Orders tab shows "3" for draft POs, Receive shows "2" for pending shipments)

---

## Implementation Priority

| Priority | Area | Impact |
|----------|------|--------|
| **P0 — Critical** | Receive Tab line-by-line receiving | Current receiving is broken for multi-line POs |
| **P0 — Critical** | Counts Tab entry workflow | Count sessions created but no way to enter counts |
| **P1 — High** | Editable order qty in Reorder Tab | Users can't adjust quantities before PO creation |
| **P1 — High** | Column header clarity + tooltips (Stock Tab) | Reduces confusion for non-technical owners |
| **P1 — High** | Tab badges + cross-tab navigation | Workflow discoverability |
| **P2 — Medium** | Orders Tab — edit drafts, confirmation dialogs | Prevents accidental actions |
| **P2 — Medium** | PO number generation | Professional-looking purchase orders |
| **P2 — Medium** | Inventory Health banner | At-a-glance operational awareness |
| **P3 — Nice to have** | Count sheet PDF, cycle counts | Operational convenience |
| **P3 — Nice to have** | Audit log quick filters | Power user efficiency |

---

## Recommended Approach

Given the scope, I recommend tackling this in **3 phases**:

**Phase 1** — Fix critical workflow gaps (Receive Tab redesign, Counts entry workflow, column clarity + tooltips)

**Phase 2** — Enhance Reorder/Orders workflow (editable quantities, confirmation dialogs, draft editing, tab badges)

**Phase 3** — Polish and power features (health banner, onboarding hints, count sheets, audit improvements)

Each phase can be implemented independently. Let me know which phase or specific items you'd like to start with.

