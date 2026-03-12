

## Add "Continue Selling When Out of Stock" Toggle

### What
Add an org-level toggle to the Online Shop retail settings that allows products to remain purchasable even when `quantity_on_hand` is 0. When disabled (default), out-of-stock products show as unavailable on the public shop.

### Changes

**1. `src/hooks/useWebsiteSettings.ts`** — Add `continue_selling_when_out_of_stock` to `WebsiteRetailSettings` interface (default `false`).

**2. `src/components/dashboard/settings/WebsiteSettingsContent.tsx`** — `RetailTab` (~line 812–818): Add a new toggle row after "Featured products on homepage":
- Label: "Continue selling when out of stock"
- Description: "Allow customers to purchase products even when stock reaches zero"
- Wired to `local.continue_selling_when_out_of_stock`
- Also update the `useState` default to include `continue_selling_when_out_of_stock: false`

**3. `src/pages/Shop.tsx`** — In the `ProductCard` or product display logic, conditionally hide the "Out of stock" badge and keep the product clickable/purchasable when `continue_selling_when_out_of_stock` is `true`. Currently `usePublicProducts` doesn't filter by stock — the card just shows an "Out of stock" badge. We pass the setting down and adjust the badge display.

**4. `src/components/shop/ProductCard.tsx`** — Accept an optional `continueSelling` prop. When `true`, suppress the "Out of stock" badge (or replace with "Made to order" / "Pre-order" text). When `false` (default), keep current behavior.

No database changes needed — this is stored as a JSON field in the existing `site_settings` table via `useSiteSettings`.

