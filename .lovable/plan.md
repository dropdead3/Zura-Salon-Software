

# Add Wholesale Price & Source to Supply Library Products

## Problem
Supply library products have no price/cost data. The wholesale price intelligence pipeline (`wholesale_price_sources` → `wholesale_price_queue`) already exists but isn't wired to the supply library catalog. Prices should live on `supply_library_products` and update when the price queue approves changes.

## Database Changes

**Add columns to `supply_library_products`:**
- `wholesale_price` (numeric, nullable) — current wholesale cost
- `recommended_retail` (numeric, nullable) — suggested retail price
- `currency` (text, default `'USD'`)
- `price_source_id` (uuid, nullable, FK → `wholesale_price_sources.id`) — which source last set the price
- `price_updated_at` (timestamptz, nullable) — when the price was last updated

**Update the price queue approval flow:**
- When a `wholesale_price_queue` item is approved and its `product_name` + `brand` matches a `supply_library_products` row, update that row's `wholesale_price`, `price_source_id`, and `price_updated_at`. This is a lightweight UPDATE in the existing `useApprovePriceUpdate` mutation (in `useWholesalePriceQueue.ts`).

## UI Changes

**`SupplyLibraryTab.tsx` — Brand detail table:**
- Add a **Price** column showing `wholesale_price` formatted as currency (e.g., `$12.50`) or `—` if null
- Add a **Source** indicator — small icon/badge showing the source type (e.g., "SalonCentric") linked from `price_source_id`, or "Manual" if no source
- Add a `price_updated_at` relative timestamp on hover (tooltip)
- Inline editing support for manually setting/overriding price on a product

**`SupplyLibraryTab.tsx` — Add/Edit product dialog:**
- Add `wholesale_price` and `recommended_retail` fields to the form

## Hook Changes

**`useSupplyLibrary.ts`:**
- Update `SupplyLibraryProduct` interface to include new price fields
- Queries already use `select('*')` so new columns will be returned automatically

**`useWholesalePriceQueue.ts` — `useApprovePriceUpdate`:**
- After updating the org-level `products` table, also update the matching `supply_library_products` row (match on `brand` + `product_name`) with the approved wholesale price and source reference

## Summary
- 1 migration (add 5 columns)
- 3 file edits (`SupplyLibraryTab.tsx`, `useSupplyLibrary.ts`, `useWholesalePriceQueue.ts`)
- No new files

