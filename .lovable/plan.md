

# Retail Product Inventory & Reorder Manager — Foundation Build

## Context
The Backroom tracks **Supplies** (product_type = 'Supplies') — the professional products used at mixing stations. But the salon also sells **retail products** (product_type = 'Products', 'Extensions') at the front desk. These 8 products currently have no dedicated inventory management, reorder workflow, or stock tracking. They just sit in a basic Settings → Retail Products table.

## What We're Building (Phase 1: Plumbing)
A new **Retail Inventory** section accessible from the Settings page, reusing the same data model patterns as Backroom but scoped to retail product types. This phase lays the foundation — stock grid, par levels, and reorder queue — without duplicating Backroom's full complexity.

### Data Layer
- **New `retail_product_settings` table** — mirrors `location_product_settings` but for retail:
  - `id`, `organization_id`, `location_id`, `product_id`, `is_tracked` (default true), `par_level`, `reorder_level`, `display_position`, `created_at`, `updated_at`
  - Unique constraint on `(organization_id, location_id, product_id)`
  - RLS: org members can read/write their own org's rows
- **No new inventory_ledger changes** — retail products already use the same `products.quantity_on_hand` and `inventory_ledger` / `inventory_projections` tables. Stock movements work out of the box.

### UI: New "Inventory" Tab on Retail Products Settings
Add an "Inventory" tab to the existing `RetailProductsSettingsContent` component (`/dashboard/admin/settings?category=retail-products&tab=inventory`):

1. **Stock Grid** — table showing retail products with current stock, par level, reorder level, retail price, cost price. Inline-editable par/reorder levels (saves to `retail_product_settings`).
2. **Reorder Queue** — filtered view of products where `quantity_on_hand <= reorder_level`. Shows suggested reorder quantity (par - on_hand), supplier, estimated cost. Simple "Create PO" action reusing the existing `AutoCreatePODialog`.
3. **Location selector** — same `MapPin` dropdown pattern used in Backroom for per-location scoping.

### Hooks
- `useRetailProductSettings(locationId)` — CRUD for `retail_product_settings` table
- `useRetailReorderQueue(locationId)` — joins products + retail_product_settings to surface items below reorder level

### Files Created/Changed
| File | Action |
|------|--------|
| Migration: `retail_product_settings` table + RLS | Create |
| `src/hooks/retail/useRetailProductSettings.ts` | Create |
| `src/hooks/retail/useRetailReorderQueue.ts` | Create |
| `src/components/dashboard/settings/retail/RetailInventoryTab.tsx` | Create |
| `src/components/dashboard/settings/retail/RetailReorderQueue.tsx` | Create |
| `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` | Edit — add "Inventory" tab |

### What's NOT in Phase 1
- Dedicated PO workflow for retail (reuses Backroom's `AutoCreatePODialog`)
- Receiving workflow (uses existing Backroom receive flow)
- Analytics (retail analytics already exist in Analytics Hub)
- Separate nav entry (stays nested under Settings → Retail Products for now)

This gets the plumbing in place so retail products have proper stock tracking, par levels, and a reorder queue — distinct from Backroom supplies.

