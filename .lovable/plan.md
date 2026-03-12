

## Five Product Intelligence Enhancements

### 1. Seasonal Velocity Weighting

**Problem:** Current velocity uses a flat 90-day average, treating sales from 89 days ago the same as yesterday's. This masks recent trends.

**Approach:** Add a weighted velocity calculation to `useProductVelocity.ts` using exponential decay — recent days count more. Split the 90-day window into three 30-day buckets with weights 3:2:1 (most recent weighted 3x). Return both `weightedVelocity` and existing `velocity` for backward compatibility. Update `MovementBadge` tooltip to show weighted velocity when available.

**Files:**
- `src/hooks/useProductVelocity.ts` — add weighted velocity to `ProductVelocityEntry`, compute 30-day buckets with 3:2:1 weighting
- `src/lib/productMovementRating.ts` — accept optional `weightedVelocity` in `VelocityInput`, prefer it for tier classification
- `src/components/ui/MovementBadge.tsx` — show weighted velocity in tooltip when present

### 2. Product Bundle Suggestions

**Problem:** No visibility into what products are frequently purchased together, missing cross-sell opportunities.

**Approach:** New hook `useProductCoPurchase.ts` that queries `phorest_transaction_items` grouped by `transaction_id` to find products bought in the same transaction. Compute a co-purchase frequency matrix, then surface "frequently bought with" suggestions. Display on the product detail modal and as a new card in analytics.

**Files:**
- `src/hooks/useProductCoPurchase.ts` — new hook: query transaction items, group by `transaction_id`, compute co-purchase pairs with frequency counts. Returns `Map<productName, { pairedWith: string; count: number }[]>`
- `src/components/dashboard/analytics/BundleSuggestionsCard.tsx` — new card: shows top co-purchase pairs sorted by frequency, with a "Bundle suggestion" label for pairs where one is a slow mover + one is a best seller
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — add BundleSuggestionsCard to the analytics hub
- `src/components/shop/ProductDetailModal.tsx` — show "Frequently bought with" section using co-purchase data

### 3. Supplier Performance Scorecard

**Problem:** No way to track whether suppliers deliver on time or fill orders completely.

**Approach:** Leverage existing `purchase_orders` and `purchase_order_items` tables. Compute metrics from PO data: promised vs. actual delivery (using `created_at` vs. `received_at` or `supplier_confirmed_at`), fill rate (items received / items ordered), and pricing consistency. Surface as a scorecard in the supplier dialog and a summary card in analytics.

**Database:** Add columns via migration:
- `purchase_orders.received_at` (TIMESTAMPTZ, nullable) — when goods were actually received
- `purchase_orders.items_received_count` (INT, nullable) — how many line items were fulfilled

**Files:**
- Migration SQL — add `received_at` and `items_received_count` to `purchase_orders`
- `src/hooks/useSupplierPerformance.ts` — new hook: query POs grouped by supplier, compute avg lead time accuracy, fill rate, order count
- `src/components/dashboard/settings/inventory/SupplierScorecard.tsx` — new component: shows supplier rating (A/B/C/D), avg delivery days vs. promised, fill rate %, total POs
- `src/components/dashboard/settings/inventory/SupplierDialog.tsx` — embed SupplierScorecard
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — add supplier performance summary card

### 4. Inventory Forecasting Dashboard

**Problem:** Users can't see when products will run out of stock, making replenishment reactive instead of proactive.

**Approach:** Use velocity data to project stock-out dates per product: `daysUntilStockout = quantity_on_hand / velocity`. Build a timeline visualization showing products sorted by urgency (soonest stock-out first). Add a "Replenishment Timeline" card to analytics and a compact version in inventory settings.

**Files:**
- `src/lib/stockoutForecast.ts` — new utility: `forecastStockout(quantityOnHand, velocity, leadTimeDays)` returns `{ daysUntilStockout, stockoutDate, needsReorderNow (if days < leadTime) }`
- `src/components/dashboard/analytics/ReplenishmentTimelineCard.tsx` — new card: horizontal bar chart showing days-until-stockout per product, color-coded (red < 7 days, amber < 14, green > 14). Scrollable list of top 20 most urgent products.
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — add ReplenishmentTimelineCard
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — add "Days until stockout" column (compact) to the products table

### 5. Dead Stock Liquidation Workflow

**Problem:** Dead weight products sit on shelves indefinitely with no formal process to clear them.

**Approach:** Add a `clearance_status` field to products (`null`, `'marked'`, `'discounted'`, `'liquidated'`). When a product is marked for clearance, track the original price and discount percentage. Show a "Clearance" tab in inventory settings with a burn-down view of clearance progress.

**Database:** Add columns via migration:
- `products.clearance_status` (TEXT, nullable) — `'marked'` | `'discounted'` | `'liquidated'`
- `products.clearance_discount_pct` (INT, nullable) — discount percentage applied
- `products.clearance_marked_at` (TIMESTAMPTZ, nullable) — when marked for clearance
- `products.original_retail_price` (NUMERIC, nullable) — price before markdown

**Files:**
- Migration SQL — add clearance fields to products
- `src/hooks/useProducts.ts` — update Product interface and mutations for clearance fields
- `src/components/dashboard/settings/inventory/ClearancePanel.tsx` — new component: lists clearance-marked products with status badges, discount controls, "Mark as liquidated" action, and a burn-down chart (units remaining over time)
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — add "Mark for clearance" bulk action for dead_weight products; add clearance badge to product rows; add Clearance tab/section
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — add clearance summary metrics to Markdown Candidates card (how many marked, capital recovered so far)
- `src/components/shop/ProductCard.tsx` — show "On Sale" badge for products with `clearance_status = 'discounted'`

### Build Order

1. Seasonal velocity weighting (foundational data improvement, all other features benefit)
2. Inventory forecasting (uses velocity, high user value)
3. Bundle suggestions (independent, uses transaction data)
4. Supplier scorecard (independent, uses PO data)
5. Dead stock liquidation (uses movement ratings, builds on markdown candidates)

### Database Migrations Summary

| Table | Columns Added |
|-------|--------------|
| `purchase_orders` | `received_at`, `items_received_count` |
| `products` | `clearance_status`, `clearance_discount_pct`, `clearance_marked_at`, `original_retail_price` |

