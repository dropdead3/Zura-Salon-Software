

## Four Product Intelligence Enhancements

### 1. Push List Generator

A new card on the stylist dashboard (Today's Prep section or standalone) showing Slow Mover + Stagnant products the stylist should actively recommend during today's appointments.

**Files:**
- `src/components/dashboard/StylistPushList.tsx` — New component: compact card listing 5-10 products rated slow_mover/stagnant with stock on hand, showing product name, movement badge, retail price, and a "why push this" tooltip (e.g., "12 units in stock, last sold 45 days ago")
- `src/pages/dashboard/DashboardHome.tsx` — Add PushList card after TodaysPrepSection for stylist roles
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — Add a "Push List" export/view section in the analytics hub for managers (full list with cost-at-risk)

**Data:** Reuses `useProductVelocity` + `useProducts` hooks. Filters to products where movement tier is `slow_mover` or `stagnant`, sorted by capital at risk (cost_price × quantity_on_hand, descending).

### 2. Velocity Trend Arrows

Compare current 90-day velocity to prior 90-day velocity to show acceleration/deceleration per product.

**Files:**
- `src/hooks/useProductVelocity.ts` — Add a second query for the prior 90-day window (days 91-180). Return `priorVelocity` alongside current velocity. Compute `velocityChange` as percentage change.
- `src/lib/productMovementRating.ts` — Add `velocityTrend` field to `VelocityInput` (optional), expose in rating tooltip
- `src/components/ui/MovementBadge.tsx` — Add optional trend arrow (↑/↓/—) next to the badge label when trend data is available
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — Pass trend data to MovementBadge
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — Show trend arrows in product performance table

**Logic:**
```text
priorVelocity = units sold in days 91-180 / 90
velocityChange = ((currentVelocity - priorVelocity) / priorVelocity) * 100
Display: ↑+25% (green) | ↓-15% (red) | — (no change or no prior data)
```

### 3. Smart Par-Level Suggestions

Use velocity data to recommend optimal par levels based on configurable days-of-supply (default 14 days).

**Files:**
- `src/lib/parLevelSuggestion.ts` — New pure utility: `suggestParLevel(velocity: number, leadTimeDays: number, safetyStockDays: number): number`. Formula: `ceil(velocity * (leadTimeDays + safetyStockDays))`. Default lead time = 7 days, safety = 7 days (totaling 14-day supply).
- `src/components/dashboard/inventory/ProductEditDialog.tsx` — Add a "Suggested: X" hint next to the par_level input, computed from velocity data. Clickable to auto-fill.
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — Add a bulk action "Apply suggested par levels" that updates all products without a par_level set
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — Show suggested vs actual par in the inventory alerts table as a column

### 4. Movement-Based Pricing Alerts

Flag Dead Weight products with high cost price for markdown consideration.

**Files:**
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — New "Markdown Candidates" callout card: lists dead_weight + stagnant products sorted by capital at risk (cost_price × quantity_on_hand). Shows product, cost price, stock, days since last sale, and estimated capital freed if marked down by 30%.
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — Add a subtle warning icon on products that are dead_weight with >$50 capital at risk, with tooltip "Consider markdown — $X tied up in non-moving stock"

**Data:** Pure client-side computation from existing `useProducts` + `useProductVelocity` data. Capital at risk = `cost_price * quantity_on_hand`. Threshold for flagging: capital at risk > $50 and tier is dead_weight or stagnant.

### Build Order

1. Velocity trend arrows (hook change first — other features benefit from trend data)
2. Smart par-level suggestions (pure utility + UI hints)
3. Push list generator (depends on velocity + products)
4. Markdown pricing alerts (depends on movement ratings)

