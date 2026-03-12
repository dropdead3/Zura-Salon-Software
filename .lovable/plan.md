

## Timezone-Safe Scheduling (Implemented)

### Problem
`new Date()` used browser-local timezone for "today", current-time indicators, and past-date validation. Users traveling to different timezones saw incorrect schedule state.

### Solution
- Created `src/lib/orgTime.ts` — pure helpers: `getOrgToday()`, `orgNowMinutes()`, `isOrgToday()`, `isOrgTomorrow()`, `getOrgTodayDate()`
- Created `src/hooks/useOrgNow.ts` — reactive hook returning `todayStr`, `nowMinutes`, `todayDate`, `isToday()`, `isTomorrow()` with 60s refresh
- No fake Date objects exposed — only primitives (string, number) to prevent accidental misuse with date-fns

### Files Updated
- `ScheduleHeader.tsx` — today button, quick days, isToday checks
- `DayView.tsx` — current-time indicator, late check-in detection, past-slot shading
- `WeekView.tsx` — current-time indicator, today/tomorrow labels, past-slot shading
- `MonthView.tsx` — today highlight
- `AgendaView.tsx` — today/tomorrow labels, today border
- `ScheduleActionBar.tsx` — payment queue timing
- `booking/StylistStep.tsx` — quick dates, calendar disabled past-date check
- `meetings/MeetingSchedulerWizard.tsx` — default date, calendar disabled check
- `shifts/ShiftScheduleView.tsx` — today highlight, "This Week" button
- `useHuddles.ts` — today's huddle query

## Auto-Reorder with Supplier Communication (Implemented)

### What It Does
Organizations can opt into automatic reorder — when stock dips below threshold, POs are calculated (using MOQ and par levels) and sent directly to the supplier via email.

### Database Changes
- `products.par_level` (INT, nullable) — desired stock level to reorder up to
- `product_suppliers.moq` (INT, default 1) — minimum order quantity
- `inventory_alert_settings.auto_reorder_enabled` (BOOL, default false)
- `inventory_alert_settings.auto_reorder_mode` (TEXT, default 'to_par') — 'to_par' or 'moq_only'
- `inventory_alert_settings.max_auto_reorder_value` (NUMERIC, nullable) — daily spend cap
- `purchase_orders.supplier_confirmed_at` (TIMESTAMPTZ, nullable) — for tracking confirmations

### Quantity Calculation
```
deficit = par_level - quantity_on_hand
order_qty = max(moq, deficit)
if moq > 1: round up to nearest MOQ multiple
```
Fallback: if par_level is null, uses `reorder_level * 2`.

### Files Updated
- Migration: Added columns to products, product_suppliers, inventory_alert_settings, purchase_orders
- `check-reorder-levels/index.ts` — auto-send logic with MOQ/par calculation, spend cap, email invocation
- `AlertSettingsCard.tsx` — auto-reorder toggle, mode selector, spend cap input
- `useInventoryAlertSettings.ts` — updated interface
- `useProducts.ts` — added par_level to Product interface
- `useProductSuppliers.ts` — added moq to ProductSupplier interface
- `ProductEditDialog.tsx` — added par level field
- `RetailProductsSettingsContent.tsx` — added par level to product form
- `SupplierDialog.tsx` — added MOQ field

### Safety Features
- Spend cap: daily auto-reorder pauses when cumulative PO value exceeds cap
- Audit trail: auto_reorder logged as stock_movement reason
- Supplier confirmation tracking via supplier_confirmed_at timestamp

## Product Movement Rating Badges (Implemented)

### What It Does
Every product gets a dynamic movement rating badge (Best Seller, Popular, Steady, Slow Mover, Stagnant, Dead Weight) computed from 90-day sales velocity data.

### Rating Tiers
- **Best Seller**: Top 10% velocity AND >0.5 units/day (emerald)
- **Popular**: Top 25% velocity AND >0.2 units/day (blue)
- **Steady**: Velocity >0.05/day (muted)
- **Slow Mover**: Velocity >0 but ≤0.05/day (amber)
- **Stagnant**: Zero velocity, sold within 180 days (orange)
- **Dead Weight**: Zero velocity, 180+ days or never sold (red)
- Products with zero stock excluded from negative ratings

### Files Created
- `src/lib/productMovementRating.ts` — pure rating logic + badge config
- `src/hooks/useProductVelocity.ts` — lightweight 90-day POS velocity query
- `src/components/ui/MovementBadge.tsx` — shared badge component with tooltip

### Files Updated
- `RetailProductsSettingsContent.tsx` — Movement column + filter dropdown in products table
- `RetailAnalyticsContent.tsx` — Movement badges on product performance table + Movement Distribution card (donut chart with actionable callouts)
- `ProductCard.tsx` — Best Seller/Popular badges on public shop cards (positive only)
- `ProductDetailModal.tsx` — Movement badge with velocity context

## Inventory Intelligence Suite v2 (Implemented)

### 1. Dead Stock Auto-Clearance Pipeline
- `DeadStockAlertCard.tsx` — Surfaces Dead Weight/Stagnant products not yet in clearance with suggested discount tiers (10%/25%/50% based on idle days)
- One-click "Mark for Clearance" applies discount and sets clearance_status

### 2. Supplier Lead Time Tracker
- `usePurchaseOrders.ts` — `useMarkPurchaseOrderReceived` already computes actual delivery days and updates `product_suppliers.avg_delivery_days` via running average
- `parLevelSuggestion.ts` — Updated to accept supplier-provided lead time instead of hardcoded 7-day default, with bounds clamping

### 3. Inventory Valuation Dashboard Card
- `InventoryValuationCard.tsx` — Shows total inventory at cost/retail, potential margin %, capital-at-risk (slow/stagnant/dead weight), with donut chart breakdown

### 4. Reorder Approval Queue
- `ReorderApprovalCard.tsx` — Surfaces draft POs from auto-reorder with one-click approve (→ sent) or reject (→ cancelled)

### 5. Stock Transfer Between Locations
- Migration: Created `stock_transfers` table with RLS (org member read, org admin manage)
- `useStockTransfers.ts` — CRUD hooks for stock transfers with stock movement logging
- `StockTransferDialog.tsx` — Dialog for creating transfers between locations
- `RetailProductsSettingsContent.tsx` — "Transfer Stock" button added to Inventory tab (visible for multi-location orgs)

## Enhancement 1: Expiry Tracking (Implemented)

### What It Does
Products can have an optional expiration date (`expires_at`) and per-product alert threshold (`expiry_alert_days`, default 30). The system surfaces expiring inventory with color-coded badges in the product table and an analytics card with auto-clearance suggestions.

### Database Changes
- `products.expires_at` (DATE, nullable) — expiration date for perishable products
- `products.expiry_alert_days` (INTEGER, default 30) — days before expiry to trigger alerts

### Expiry Alert Buckets
- **Expired** (red): past expiration → suggests 50% markdown
- **Critical** (orange): within alert threshold → suggests 25% markdown
- **Warning** (amber): within 2× alert threshold → suggests 10% markdown

### Files Created
- `src/components/dashboard/analytics/ExpiryAlertCard.tsx` — PinnableCard showing expiring products with one-click clearance actions

### Files Updated
- `src/hooks/useProducts.ts` — Added `expires_at`, `expiry_alert_days` to Product interface; added `expiringOnly` filter
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — Expiry date + alert days in product form; color-coded Expiry column in product table
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx` — Wired ExpiryAlertCard into analytics hub
