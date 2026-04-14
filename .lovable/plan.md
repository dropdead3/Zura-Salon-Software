

# Pull Accurate Per-Model Pricing and Images from Stripe

## Problem
Both product cards currently display the same price (`skuData.skus[0].amount`) and share a single image. The edge function already returns separate `skus` and `s710_skus` arrays with per-SKU images from Stripe's `hardware_product.images`, but the frontend ignores this data.

## What changes

### 1. Update the hook interface to expose per-model data
**File:** `src/hooks/useTerminalHardwareOrder.ts`

The `SkuResponse` already has `s710_skus`. No interface changes needed — the data is available.

### 2. Map SKU data to each model card
**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

Instead of `const readerPrice = skuData?.skus?.[0]?.amount`, derive per-model pricing:

- Parse `skuData.skus` to find S700 vs S710 SKUs by matching product name (contains "s700" or "s710")
- If distinct SKUs exist, each card gets its own price and image
- If only one SKU exists (fallback mode), both cards share the same price (current behavior, graceful degradation)
- Use `s710_skus` as a secondary source if the main `skus` array doesn't differentiate

### 3. Display Stripe product images on the main cards
Currently images only show in the purchase dialog. Add the Stripe product image (from the SKU's `image_url`) to each model card alongside the icon, replacing the plain icon box when an image is available. Fall back to the current icon if the image fails to load.

### 4. Update the purchase dialog to use model-specific pricing
When a model is selected, the dialog price, subtotal, and checkout items use the correct SKU's `amount`, `id`, and `image_url` — not always `skuData.skus[0]`.

### 5. Edge function — no changes needed
The `get_skus` handler already returns enriched SKUs with `image_url` from Stripe's `hardware_product.images` array, with CDN fallbacks. The data pipeline is correct.

## Summary of UI changes
- Each card shows its own Stripe-sourced price (may differ between S700/S710)
- Each card displays the Stripe product image (reader photo) instead of a generic Lucide icon
- Dialog uses model-specific SKU data for accurate checkout totals
- Graceful fallback when only one SKU or fallback pricing is available

