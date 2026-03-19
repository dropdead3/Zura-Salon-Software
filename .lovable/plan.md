

# Smart Inventory Command Center — System Architecture Plan

## Current State Audit

**What exists:**
- **StockTab** (819 lines): Brand-grouped table with columns: Checkbox, Product, Container, Stock, Reorder Pt, Par Level, Reorder Qty, PO History sparkline, Status (pill badge), Cost, Actions (audit + quick reorder). KPI cards, inline editing, PDF export, Auto Create POs, Auto-Set Pars, multi-select with bulk PO creation.
- **ReorderTab** (610 lines): Supplier-grouped reorder queue with editable order quantities, bulk PO creation, email PO preview, AI recommendations.
- **OrdersTab** (412 lines): PO lifecycle (draft/sent/received/cancelled), expandable line items, delivery date tracking, email actions.
- **ReceiveTab**: Line-by-line PO receiving with discrepancy codes.
- **CountsTab**: Physical inventory count entry.
- **AuditLogTab**: Change history.
- **ReorderAnalyticsTab**: 6-month analytics.
- **Data layer** (`useBackroomInventoryTable`): Computes `effective_stock = stock + open_po_qty`, `recommended_order_qty = par - stock - open_po_qty`. Already handles multi-location via `location_product_settings`.

**Key findings:**
- The suggested order logic already exists (`recommended_order_qty`) with pending PO integration
- Supplier grouping exists in ReorderTab but not StockTab
- Manual override exists in ReorderTab (`qtyOverrides`) but not in StockTab
- Status system uses pill badges, not the dual-layer (state + severity) specified
- No "days remaining" or usage intelligence in the stock view
- StockTab and ReorderTab are separate — the spec wants them merged into one Command Center view
- PO Builder panel (right-side) doesn't exist
- Summary/control bar with clickable filters doesn't exist (KPI cards partially fill this role)
- The table still shows Reorder Pt, Par Level, Reorder Qty, PO History as primary columns — spec says remove these

---

## Phased Build Plan

### Section 1 — Table Restructure
**What:** Replace StockTab's column layout with the command center columns: Product, Stock, Suggested Order (primary), Status (dual-layer placeholder), Supplier, Cost, Actions. Move Reorder Pt, Par Level, PO History into an expandable detail row.
**Dependencies:** None — pure UI restructure.
**Files:** `StockTab.tsx`

### Section 2 — Suggested Order Engine
**What:** Make `recommended_order_qty` the dominant visual element. Bold when > 0, "—" when none. Add `effective_stock` display showing `(X on order)`. Integrate manual override (editable qty field with Auto/Edited indicator) into StockTab.
**Dependencies:** Section 1 (column exists). Data layer already supports this.
**Files:** `StockTab.tsx`, potentially `useBackroomInventoryTable.ts` (add effective_stock field)

### Section 3 — Dual-Layer Status System
**What:** Replace pill badges with stacked text (State: "Out of Stock" / "In Stock") + (Severity: Critical / Low / Healthy). Add left color bar for severity. Red only for critical.
**Dependencies:** Section 1 (status column). Update `STOCK_STATUS_CONFIG`.
**Files:** `StockTab.tsx`, `useBackroomInventoryTable.ts` (new severity computation)

### Section 4 — Row Prioritization
**What:** Subtle highlight for rows needing action. Stronger emphasis for critical. Elevated feel via border-left or background gradient.
**Dependencies:** Section 3 (severity available).
**Files:** `StockTab.tsx`

### Section 5 — Supplier Grouping
**What:** Group rows by supplier (collapsible). Header shows supplier name + estimated total. "Unassigned" group last.
**Dependencies:** Section 1 (table structure). Replaces current brand grouping.
**Files:** `StockTab.tsx`

### Section 6 — Summary / Control Bar
**What:** Top summary strip: total items needing reorder, critical count, estimated PO value. Clickable filters that scope the table.
**Dependencies:** Section 3 (severity data).
**Files:** `StockTab.tsx`

### Section 7 — Action System
**What:** Replace audit/cart icons with primary "Add to PO" action. Behavior: adds item using Suggested Order, toggles to "Added" state, allows inline edit of qty.
**Dependencies:** Section 2 (suggested order visible).
**Files:** `StockTab.tsx`

### Section 8 — Bulk Action System
**What:** Sticky bottom bar on selection: "Add Selected to PO", "Auto Build PO", "Clear Selection". Est. cost summary.
**Dependencies:** Section 7 (action system).
**Files:** `StockTab.tsx`

### Section 9 — PO Builder Panel
**What:** Right-side slide panel. Groups items by supplier. Shows items, quantities, editable values, cost per item, total cost. States: Draft / Submitted. Can manage multiple POs.
**Dependencies:** Sections 7 + 8 (items added to PO).
**Files:** New `POBuilderPanel.tsx`, `StockTab.tsx` (layout split)

### Section 10 — Auto Build PO
**What:** "Auto Build PO" button groups all items with suggested orders by supplier, populates PO builder panel.
**Dependencies:** Section 9 (PO panel exists).
**Files:** `StockTab.tsx`, `POBuilderPanel.tsx`

### Section 11 — Smart Inventory Intelligence
**What:** Add secondary info per row: days remaining (from usage velocity), recent usage, optional trend. Display as subtle secondary text, not cluttered.
**Dependencies:** Section 1 (table structure). May need usage data hook.
**Files:** `StockTab.tsx`, possibly new `useInventoryIntelligence.ts`

### Section 12 — Interaction + UX Polish
**What:** Row hover states, button hover, smooth transitions, no layout shift, no overflow, stable rendering. No heavy animations.
**Dependencies:** All sections complete.
**Files:** All inventory components

### Section 13 — Visual Design System
**What:** Enforce consistent radii, spacing, right-aligned numbers, clean "—" placeholders, reduced visual noise. Stripe/Linear/Apple feel.
**Dependencies:** Section 12.
**Files:** All inventory components

---

## Dependency Graph

```text
Section 1 (Table Restructure)
  ├── Section 2 (Suggested Order Engine)
  │     └── Section 7 (Action System)
  │           └── Section 8 (Bulk Actions)
  │                 └── Section 9 (PO Builder Panel)
  │                       └── Section 10 (Auto Build PO)
  ├── Section 3 (Dual-Layer Status)
  │     ├── Section 4 (Row Prioritization)
  │     └── Section 6 (Summary/Control Bar)
  ├── Section 5 (Supplier Grouping)
  └── Section 11 (Intelligence)

Section 12 (UX Polish) — after all above
Section 13 (Visual Design) — after Section 12
```

## Risks & Conflicts

1. **StockTab vs ReorderTab overlap**: The spec merges reorder logic into the main stock view. The existing ReorderTab becomes partially redundant. Recommend keeping ReorderTab as a focused "reorder-only" filtered view but building the command center into StockTab.
2. **Brand grouping → Supplier grouping**: Current StockTab groups by brand. Switching to supplier grouping changes the mental model. Some products may lack suppliers. Need robust "Unassigned" handling.
3. **File size**: StockTab is already 819 lines. This restructure will require extracting sub-components to keep it manageable.
4. **Data layer changes are minimal**: `useBackroomInventoryTable` already computes most needed fields. Adding `effective_stock` and severity is lightweight.

## Recommended Build Sequence

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13

One section at a time. Approval between each.

