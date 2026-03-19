

# Simplify Stock Tab Header Layout

## Problem
Four dense horizontal bars stack before any product data is visible: filters row, decision header, table column headers, and supplier group row. This creates visual clutter and makes the page hard to parse at a glance.

## Approach: Merge the Decision Header into the Filters Row

Collapse the current 4-bar layout into 3 by merging the "decision header" (bar 2) content into the filters row (bar 1). This removes one full horizontal strip and groups related controls together.

### New layout (3 bars instead of 4)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [🔍 Search...        ] [Category ▼] [Status ▼]  │ 191 Critical · 0 Low · Est. PO: $1,716  [Review Items] [⚡ Auto Build PO] [Auto-Set Pars] │
├──────────────────────────────────────────────────────────────────────┤
│ ☐  Product              Stock ⓘ    Suggested ⓘ   Status   Supplier   Cost                │
├──────────────────────────────────────────────────────────────────────┤
│ ▸ 🚚 Unassigned Supplier  191 items · $1,716.04 est.  [191 to reorder]    [Create PO] [Assign Supplier]  │
│    Color (113)                                                        │
```

## Changes

**Edit: `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`**

1. **Merge decision header into the filters row** (lines ~626-696 and ~698-765):
   - Remove the standalone `<div className="px-4 py-2.5 border-b...">` decision header inside the Card
   - Move the action-item summary (critical/low counts, est. PO value) and the "Review Items" / "Auto Build PO" buttons into the existing filters `<div>` row, right-aligned after the filter controls
   - When `hasActionItems` is false, show the "All stock levels healthy" + totals inline in the same row
   - The severity count buttons (Critical / Low) become compact badges in the filter bar rather than centered text

2. **Consolidate action buttons**: Move the "PO Builder" badge button and "Auto-Set Pars" button to the right side of the merged bar, grouped with "Review Items" and "Auto Build PO". This puts all actions in one place.

3. **Card starts directly with table headers**: The `<Card>` now opens straight into `<Table>` with column headers — no intermediate decision bar.

### Visual result
- Filters + KPI summary + actions all in one responsive row (wraps naturally on narrow screens)
- Table column headers are the first thing inside the card
- Supplier group rows follow immediately
- Net: one fewer dense bar, clearer visual hierarchy

**1 file edited.**

