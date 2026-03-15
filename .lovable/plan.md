

# Inventory Enhancements — Updated Plan

## Important Context: SalonInteractive Integration
The user clarified that Vish's "Orders" feature isn't just internal PO creation — it's placing real orders through **SalonInteractive**, SalonCentric's salon supply ordering platform. This means the long-term goal is an actual supply ordering integration, not just internal PO tracking.

For now, we'll build the foundational improvements that work with Zura's existing PO/vendor infrastructure and note where a future SalonInteractive integration would plug in.

---

## What We'll Build Now

### 1. Inventory KPI Summary Cards
Add 3 hero cards above the Inventory tab content in `RetailProductsSettingsContent.tsx`:
- **Current Stock**: sum of `quantity_on_hand` across active products
- **Products to Reorder**: count where `quantity_on_hand <= reorder_level`
- **Total Active Products**: count of active products

Uses existing `useProducts` data already fetched in the component.

### 2. Inventory Status Badges
Add a computed status badge column to the product table rows:
- `OUT OF STOCK` (red): `quantity_on_hand === 0`
- `URGENT REORDER` (amber): `quantity_on_hand > 0 && quantity_on_hand <= reorder_level`
- `IN STOCK` (green): otherwise

This goes into whichever component renders the inventory/product table rows.

### 3. Container Size Field
- **Migration**: `ALTER TABLE products ADD COLUMN container_size TEXT`
- Display in product table and product edit form
- Useful for backroom supply products (color tubes, developers) to track net weight/volume

### 4. Purchase Order Detail Dialog
New `PurchaseOrderDetailDialog.tsx` opened from `PurchaseOrdersPanel` row click:
- PO metadata header (created date, status, PO number, supplier)
- Line items table with product name, brand, category, container size, qty ordered vs received, unit cost, line total
- Footer with item count + subtotal
- CSV export button
- For single-product POs (legacy), show the single product as one line

### 5. SalonInteractive as Future Integration Entry
Add SalonInteractive to `platformIntegrations.ts` as a `coming_soon` entry under a new `'supply_ordering'` category. This signals the roadmap direction without requiring implementation now:
```
{ id: 'salon-interactive', name: 'SalonInteractive', category: 'supply_ordering', status: 'coming_soon' }
```

---

## Files to Create
- `src/components/dashboard/settings/inventory/PurchaseOrderDetailDialog.tsx`

## Files to Modify
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — KPI cards + status badges
- `src/components/dashboard/settings/inventory/PurchaseOrdersPanel.tsx` — row click → detail dialog
- `src/config/platformIntegrations.ts` — add SalonInteractive entry

## Database Migration
- `ALTER TABLE products ADD COLUMN IF NOT EXISTS container_size TEXT`

