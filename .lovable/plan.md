

# Phase 3 — Polish and Power Features

Phase 3 covers three items: **Inventory Health Banner**, **Audit Log Quick Filters**, and **First-Time Onboarding Hints**.

---

## 1. Inventory Health Banner (BackroomInventorySection.tsx)

Add a compact, dismissible alert banner between the section header and the tabs showing critical operational alerts at a glance.

**Data source:** Reuse the already-fetched `inventory` and `allOrders` data in `BackroomInventorySection`.

**Metrics displayed (icon + count chips):**
- Out of Stock count (red)
- Low Stock count (amber)  
- Draft POs awaiting send (blue)
- POs awaiting receive (purple)

**Behavior:**
- Only renders when at least one metric is > 0
- Compact single-row layout with clickable chips that switch to the relevant tab
- Uses a controlled `activeTab` state on `<Tabs>` so chips can programmatically navigate

**Implementation:**
- Convert `<Tabs defaultValue="stock">` to controlled `<Tabs value={activeTab} onValueChange={setActiveTab}>`
- Add an `InventoryHealthBanner` inline component that renders metric chips
- Each chip calls `setActiveTab('reorder')` etc. on click

---

## 2. Audit Log Quick Filters (AuditLogTab.tsx)

Add quick-filter chip buttons above the existing filter bar for common time/type presets.

**Chips to add:**
- "Today" — sets dateFrom to today
- "This Week" — sets dateFrom to start of current week
- "Adjustments" — sets typeFilter to 'stock' + search to 'adjustment'
- "Receiving" — sets typeFilter to 'stock' + search to 'receiving'

**Also:**
- Rename type badge labels: "Stock" → "Qty Change", "Setting" → "Level Change"
- Add page size selector (25 / 50 / 100) next to pagination

---

## 3. First-Time Onboarding Hint (BackroomInventorySection.tsx)

Use the existing `FirstTimeCallout` component to show a workflow guide for first-time users.

- **ID:** `backroom-inventory-workflow`
- **Title:** "Inventory Workflow"
- **Description:** "Track Products → Set Reorder Levels → Monitor Stock → Create Orders → Receive Shipments → Run Counts"
- Placed between the health banner and tabs
- Auto-dismissed via localStorage (existing pattern)

---

## Files to modify

| File | Changes |
|------|---------|
| `BackroomInventorySection.tsx` | Add health banner, controlled tabs, FirstTimeCallout |
| `AuditLogTab.tsx` | Quick filter chips, rename type labels, page size selector |

No database changes needed. No new hooks required — all data is already available.

