

## Gift Cards Hub within Retail Settings

### Architecture

Add a **Gift Cards** tab to `RetailProductsSettingsContent` that consolidates all gift card functionality into one place. Remove "Gift Cards" from the `product_type` options since they're financial instruments, not inventory.

```text
Retail Products Settings
┌──────────┬────────┬────────────┬───────────┬─────────────┐
│ Products │ Brands │ Categories │ Inventory │ Gift Cards  │
└──────────┴────────┴────────────┴───────────┴─────────────┘
```

The **Gift Cards** tab will have a sub-tab layout:

```text
Gift Cards Tab
┌──────────────┬──────────┬────────────────┬─────────┐
│ Active Cards │ Settings │ Design & Print │ Orders  │
└──────────────┴──────────┴────────────────┴─────────┘
```

### Changes

**1. `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**

- Add a **Gift Cards** tab (with `Gift` icon) to the main `TabsList`
- The tab renders a new `GiftCardsHub` component with 4 inner sub-tabs:
  - **Active Cards** — Move/adapt the existing `GiftCardManager` content (stats cards, search, create dialog, cards table) with new capabilities: edit card dialog (adjust balance, change expiry, reassign client, deactivate), and redemption history per card
  - **Settings** — Configuration panel: default expiry duration, suggested denominations (add/remove amounts), default terms text, auto-generate vs manual codes toggle
  - **Design & Print** — Move `GiftCardDesignEditor` content inline (card branding: colors, template, QR toggle, logo, preview)
  - **Orders** — Move `PhysicalCardOrderForm` + `PhysicalCardOrderHistory` inline
- Remove `'Gift Cards'` from the `PRODUCT_TYPES` constant → becomes `['Products', 'Extensions', 'Merch']`
- Update `getProductType` fallback to no longer classify items as "Gift Cards"

**2. Database migration** — Remove "Gift Cards" as a product_type
- `UPDATE public.products SET product_type = 'Products', is_active = false WHERE product_type = 'Gift Cards'` (soft-deactivate any gift card products that exist in the products table — use the data insert tool, not migration)

**3. `src/pages/dashboard/settings/LoyaltyProgram.tsx`**
- Remove the Design, Print, and Order tabs (they move to Retail Settings → Gift Cards)
- This page retains only Program and Tiers tabs (pure loyalty/points functionality)

**4. `src/components/dashboard/settings/GiftCardsHub.tsx`** (new file)
- Self-contained component with the 4 sub-tabs described above
- Imports and composes: `GiftCardDesignEditor`, `PhysicalCardOrderForm`, `PhysicalCardOrderHistory`
- Contains the Active Cards table (adapted from `GiftCardManager`) with an **Edit Card** dialog:
  - Adjust balance (add/subtract with reason)
  - Update expiry date
  - Toggle active/inactive
  - View redemption history (from `balance_transactions` table)
- Contains the Settings sub-tab: denomination management, default expiry, terms text

**5. `src/hooks/useGiftCards.ts`**
- Add `useUpdateGiftCard` mutation (update expiry, active status, recipient/purchaser info)
- Add `useGiftCardTransactions` query to fetch redemption history for a specific card from `balance_transactions` where `reference_transaction_id` matches the gift card ID

**6. `src/utils/serviceCategorization.ts`**
- Keep `isGiftCardProduct` for analytics/revenue classification (transaction items still need categorization)
- No changes needed here — it's used for transaction classification, not product management

### What stays the same
- `GiftCardManager` in Transactions page stays as a **read-only quick-reference** (or we can remove it and link to the Retail Settings hub instead)
- Revenue analytics continue to classify gift card **sales** using regex on transaction item names
- The `gift_cards` database table and all hooks remain unchanged structurally

### Summary
- 2 new files: `GiftCardsHub.tsx`, updates to `useGiftCards.ts`
- 3 edited files: `RetailProductsSettingsContent.tsx`, `LoyaltyProgram.tsx`, `useGiftCards.ts`
- 1 data update (not schema migration): soft-deactivate gift card products
- No new dependencies

