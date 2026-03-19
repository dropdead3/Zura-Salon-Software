

# Reorganize Stock Tab Toolbar — Two Rows

## Problem
Everything is crammed into one `flex-wrap` row. The search input gets squeezed to its `min-w-[180px]` minimum, making it feel small and crowded alongside filters, KPI badges, and action buttons.

## Approach: Split into Two Distinct Rows

**Row 1 — Search & Filters** (full breathing room):
```text
[🔍 Search products, brands, SKUs...              ] [Category ▼] [Status ▼]
```
- Search input gets `flex-1` with no competing elements — it fills all remaining space
- Two dropdowns sit to the right

**Row 2 — KPI Summary & Actions** (compact utility bar):
```text
191 Critical · 0 Low · Est. PO: $1,716.04    [Review Items] [⚡ Auto Build PO] [Auto-Set Pars] [PO Builder]
```
- Left-aligned KPI badges, right-aligned action buttons
- Uses `justify-between` to spread them naturally

## Changes

**Edit: `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`** (~lines 626-755)

1. Wrap the current single `<div className="flex flex-wrap ...">` in a parent `<div className="flex flex-col gap-2 mb-3">`
2. **Row 1**: `<div className="flex items-center gap-2">` containing only the search input (`flex-1`, remove `min-w-[180px]`) and the two Select dropdowns
3. **Row 2**: `<div className="flex flex-wrap items-center gap-2">` containing the KPI summary text, action buttons (Review Items, Auto Build PO, Auto-Set Pars), and PO Builder badge — using `ml-auto` on the buttons group to push them right

**1 file edited.**

