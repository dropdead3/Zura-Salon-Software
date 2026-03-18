

## Three Enhancements: Send All Drafts, Reorder History Sparklines, Auto-Set Par Levels

### 1. "Send All Draft POs" Batch Action — Orders Tab

**File:** `src/components/dashboard/backroom-settings/inventory/OrdersTab.tsx`

Add a batch action bar above the PO table (visible when status filter is "all" or "draft" and draft POs exist):
- "Send All Drafts" button with `Mail` icon — iterates over all draft POs that have a `supplier_email`, calls `send-reorder-email` for each, then updates status to `sent`
- Confirmation dialog listing count of draft POs with emails vs. those missing emails (skipped)
- Progress toast during batch send, summary toast on completion
- Uses existing `send-reorder-email` edge function and `useUpdatePurchaseOrder` to mark each as `sent`

**New file:** `src/components/dashboard/backroom-settings/inventory/SendAllDraftsDialog.tsx`
- Confirmation dialog showing: X drafts with supplier email (will send), Y drafts without email (skipped)
- "Send X POs" primary action button with loading state

### 2. Reorder History Sparkline Per Product — Stock Tab

**New hook:** `src/hooks/backroom/useProductPOHistory.ts`
- Queries `purchase_orders` for the org, groups by `product_id`, aggregates into weekly PO counts over the last 12 weeks
- Returns `Map<product_id, number[]>` (12-entry array of weekly PO counts)
- Uses a single query with date filter (`created_at >= 12 weeks ago`) then client-side bucketing

**File:** `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`
- Add a narrow "PO History" column after "Order Qty" in the table header
- Render `<TrendSparkline data={poHistory} variant="muted" width={64} height={20} />` per row using the existing `TrendSparkline` component
- If no PO history, show `—`

### 3. Auto-Set Par Levels — Stock Tab

Uses the existing `suggestParLevel()` utility from `src/lib/parLevelSuggestion.ts` and `product_suppliers.avg_delivery_days` for lead time.

**New hook:** `src/hooks/backroom/useAutoParSuggestions.ts`
- Fetches trailing 28-day `stock_movements` (type = `dispensing` or `count_adjustment`) per product to compute daily velocity
- Fetches `avg_delivery_days` from `product_suppliers` per product
- Runs `suggestParLevel(velocity, leadTimeDays)` for each product
- Returns `Map<product_id, ParLevelSuggestion>`

**New file:** `src/components/dashboard/backroom-settings/inventory/AutoParDialog.tsx`
- Triggered from a "Auto-Set Par Levels" button in StockTab toolbar (next to PDF export / Auto Create POs)
- Table showing: Product, Current Par, Suggested Par, Velocity, Explanation
- Checkboxes for include/exclude per row
- "Apply Selected" button — bulk upserts par_level to `products` or `location_product_settings` depending on whether a location is selected
- Products with zero velocity are shown but unchecked by default with a note "No recent usage"

**File:** `src/components/dashboard/backroom-settings/inventory/StockTab.tsx`
- Add "Auto-Set Pars" button to toolbar
- Wire dialog open/close state

### Files

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/inventory/OrdersTab.tsx` | **Edit** — Add batch send bar + dialog trigger |
| `src/components/dashboard/backroom-settings/inventory/SendAllDraftsDialog.tsx` | **Create** — Confirmation + batch send logic |
| `src/hooks/backroom/useProductPOHistory.ts` | **Create** — 12-week PO frequency per product |
| `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` | **Edit** — Add sparkline column + Auto-Set Pars button |
| `src/hooks/backroom/useAutoParSuggestions.ts` | **Create** — Velocity-based par level suggestions |
| `src/components/dashboard/backroom-settings/inventory/AutoParDialog.tsx` | **Create** — Review + apply suggested par levels |

