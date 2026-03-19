

# Product/Color Usage Frequency Timetable

## Goal
Add a "Usage Frequency" timetable to the Backroom Analytics tab that shows how often each color/product is dispensed, clearly highlighting rarely-used items that may be candidates for destocking.

## What Exists Today
- **`useInventoryIntelligence`** — 28-day stock_movements velocity per product (by product ID, not name)
- **`useProductUsageTrends`** — 30-day mix_bowl_lines aggregation per stylist
- **`useBackroomBrandUsage`** — Brand-level aggregation of dispensed weight/cost
- **`SeasonalDemandOverlay`** — Week-over-week comparison (top 10 only)
- **Retail `DeadStockAlertCard`** — Zero-sale retail products (POS transactions, not backroom dispensing)

None of these provide an org-wide, product-level frequency timetable for backroom color/chemical usage with clear "rarely used" flagging.

## What to Build

### 1. New Hook: `useProductUsageFrequency`
**File:** `src/hooks/backroom/useProductUsageFrequency.ts`

Queries `mix_bowl_lines` joined through `mix_bowls` → `mix_sessions` for the last 90 days. Aggregates per product:
- **Total dispensed quantity** (grams)
- **Total sessions used in** (unique mix_session count)
- **Last used date**
- **Days since last use**
- **Usage tier**: `frequent` (weekly+), `regular` (bi-weekly), `occasional` (monthly), `rare` (1-2x in 90d), `dormant` (0 uses)

Also pulls `products` table to include items with zero usage (dormant). Supports location filter.

### 2. New Component: `ProductUsageFrequencyTable`
**File:** `src/components/dashboard/backroom/ProductUsageFrequencyTable.tsx`

A sortable table card showing all backroom products with columns:
- Product Name, Brand, Category
- Times Used (session count), Total Dispensed (g)
- Last Used (relative date)
- Usage Tier badge (color-coded: green/blue/yellow/orange/red)
- Trend spark indicator (optional: up/down vs prior 90d)

Features:
- Sort by any column (default: times used ascending — rarest first)
- Filter by tier (e.g. show only "Rare" and "Dormant")
- Search by product name
- Summary strip at top: X products total, Y rarely used, Z dormant, $W capital in dormant stock
- "Dormant" products highlighted with amber row background

### 3. Surface in Backroom Analytics Tab
**Edit:** `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`

Add `ProductUsageFrequencyTable` to the Analytics tab content, after `SeasonalDemandOverlay`.

## Summary

| Change | Type |
|--------|------|
| `useProductUsageFrequency.ts` | New hook |
| `ProductUsageFrequencyTable.tsx` | New component |
| `BackroomDashboardOverview.tsx` | Edit — add to Analytics tab |

No migrations needed — reads existing `mix_bowl_lines`, `mix_sessions`, `products` tables.

