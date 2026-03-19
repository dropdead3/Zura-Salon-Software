

# Product & Brand Analytics for Backroom

## What We're Building

A new **Product Analytics** section within the Backroom Analytics tab, inspired by the Vish Product Usage Report. This adds two levels of hierarchy that don't exist today: **Category-level** and **Product-level** usage breakdowns with horizontal bar charts and a detailed data table.

The existing Brand Usage donut chart remains but is reorganized into a clear 3-tier analytics hierarchy: **Categories → Products → Brands**.

---

## Architecture

```text
BackroomInsightsSection (Analytics tab)
├── KPI Strip (existing — unchanged)
├── Product Analytics Card (NEW)
│   ├── Top Categories — horizontal bar chart (cost by category)
│   ├── Top Products — horizontal bar chart (cost by product, top 20)
│   └── Product Categories Table — sortable table with avatar initials
│       Columns: Name, Dispensed, Waste, Wholesale Cost, Retail Price, # Services
├── Employee Performance (existing — unchanged)
├── History Chart (existing — unchanged)
└── Brand Usage (existing — unchanged)
```

---

## Changes

### 1. New hook: `src/hooks/backroom/useBackroomProductAnalytics.ts`
Aggregates `mix_bowl_lines` data (same session→bowl→line pattern as existing hooks) grouped by:
- **Category**: using `product_id` → join `products.category`
- **Product**: using `product_id` → join `products.name`, `products.cost_price`, `products.retail_price`

Returns:
- `CategoryUsageRow[]`: category name, dispensed qty, waste qty, wholesale cost, retail value, service count
- `ProductUsageRow[]`: product name, dispensed qty, cost, sorted by cost descending (top 20)

Uses `waste_events` for waste qty per product (same pattern as `useBackroomBrandUsage`).

### 2. New component: `src/components/dashboard/backroom-settings/BackroomProductAnalyticsCard.tsx`
A single Card with three visual zones:

**Top Categories** (left half of top row):
- Horizontal `BarChart` (Recharts) with category names on Y-axis, cost on X-axis
- Color-coded bars (one distinct color per category)

**Top Products** (right half of top row):
- Horizontal `BarChart` with product names on Y-axis (truncated), cost on X-axis
- Top 20 products by cost, with distinct bar colors

**Product Categories Table** (below charts):
- Section header "PRODUCT CATEGORIES" with accent underline
- Table columns: Name (with colored initial avatar), Dispensed (g), Waste (g), Wholesale Cost ($), Retail Price ($), # Services
- Sortable by any column
- Uses existing design tokens and table components

### 3. Update `BackroomInsightsSection.tsx`
- Import and render `BackroomProductAnalyticsCard` between the KPI strip and Employee Performance table
- Pass `startDate`, `endDate`, `rangeLabel`, `locationId` props (same as existing cards)

---

## Data Flow
All data comes from existing tables — no database changes needed:
- `mix_sessions` → `mix_bowls` → `mix_bowl_lines` (dispensed qty, cost, product_id)
- `products` (category, name, cost_price, retail_price)
- `waste_events` (waste qty per product)

The hook follows the exact same session→bowl→line fetch pattern already used by `useBackroomBrandUsage` and `useBackroomAnalytics`.

---

## Files
1. **Create** `src/hooks/backroom/useBackroomProductAnalytics.ts` — category + product aggregation hook
2. **Create** `src/components/dashboard/backroom-settings/BackroomProductAnalyticsCard.tsx` — charts + table UI
3. **Edit** `src/components/dashboard/backroom-settings/BackroomInsightsSection.tsx` — add the new card

