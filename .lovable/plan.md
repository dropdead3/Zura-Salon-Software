

# Terminal Hardware Order Enhancement — Pricing, Accessories, and Product Images

## Summary

Enrich the terminal hardware request/purchase flow with:
1. Device type and accessory selection in the order form
2. Live pricing from Stripe SKU API (with fallback images)
3. Product images wired from Stripe's hardware product data
4. Platform admin revenue tracking on the requests table

---

## Technical Details

### 1. Database Migration

Add columns to `terminal_hardware_requests`:

```sql
ALTER TABLE public.terminal_hardware_requests
  ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 's710',
  ADD COLUMN IF NOT EXISTS accessories JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS estimated_total_cents INTEGER DEFAULT 0;
```

The edge function already inserts `device_type: 's710'` but the column doesn't exist — this fixes that silent failure. `accessories` stores an array of `{id, name, quantity, unit_price_cents}`. `estimated_total_cents` records the price snapshot at request time.

### 2. Edge Function: `terminal-hardware-order` — Return Images

Update the `get_skus` action to:
- Extract `hardware_product.images` from the Stripe SKU API response and include them in the returned data
- Add fallback image URLs for the static/fallback path (Stripe's public product page images for S710, dock, hub, case)
- Return accessories with image URLs in the response shape

Updated response shape:
```typescript
{
  source: 'stripe_api' | 'fallback',
  skus: [{ id, product, amount, currency, status, description, image_url }],
  accessories: [{ id, product, amount, currency, image_url }],
  shipping_methods: [...],
  pricing_note: string
}
```

Fallback images will use Stripe's publicly hosted CDN URLs for the S710 product line (these are stable Stripe-hosted assets).

### 3. Edge Function: `manage-terminal-requests` — Store Pricing + Accessories

Update `create_request` action to accept and persist:
- `device_type` (already sent, now stored)
- `accessories` array with id/quantity
- `estimated_total_cents` computed from SKU prices passed from the client

Update `list_all_requests` to return the new fields so platform admin sees pricing.

### 4. Hook: `useTerminalHardwareOrder.ts` — Expanded Types

Add `image_url` to `HardwareSku` and `HardwareAccessory` interfaces. No logic change — the edge function already returns the data, UI just needs to consume it.

### 5. Hook: `useTerminalRequests.ts` — Expanded Type

Add `device_type`, `accessories`, `estimated_total_cents` to `TerminalHardwareRequest` interface.

### 6. UI: `TerminalPurchaseCard` — Product Images + Accessory Selection

Replace the generic `<Smartphone>` icon with the actual product image from Stripe:
- Use `<img src={sku.image_url} />` with a fallback to the Smartphone icon if no image
- Add an accessories section below the reader with checkboxes for dock, hub, case — each showing image, name, and price
- Update the order summary to include selected accessories with line-item pricing
- Pass accessories to the checkout mutation

### 7. UI: `TerminalRequestsTable` (Platform Admin) — Revenue Column

Add columns:
- "Est. Total" showing `estimated_total_cents` formatted as currency
- "Accessories" showing count or list of selected accessories
- Update the ManageRequestDialog to show full order breakdown

### 8. Purchase Dialog Enhancement

The purchase dialog gets:
- Product image for S710 at the top
- Accessory cards with images, toggle selection, quantity
- Running total that updates as accessories are added
- All items passed as `items[]` to the `create_checkout` mutation (already supported)

---

## Files Modified

| File | Change |
|------|--------|
| Migration (new) | Add `device_type`, `accessories`, `estimated_total_cents` columns |
| `supabase/functions/terminal-hardware-order/index.ts` | Return `image_url` from SKU API + fallback images |
| `supabase/functions/manage-terminal-requests/index.ts` | Persist new fields on create |
| `src/hooks/useTerminalHardwareOrder.ts` | Add `image_url` to interfaces |
| `src/hooks/useTerminalRequests.ts` | Add new fields to interface |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Product images, accessory selection, pricing breakdown |
| `src/components/platform/stripe/TerminalRequestsTable.tsx` | Revenue column, accessories display |

7 files touched. 1 migration. No new dependencies.

