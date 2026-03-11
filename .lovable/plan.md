

## Add Gift Cards to Retail Breakdown

### Current State
The retail breakdown accordion currently shows 3 sub-categories: Products, Merch, and Extensions — all sourced from `phorest_transaction_items` with `item_type` of `product/retail`.

**Key finding**: There are zero gift card entries in the POS transaction data. Gift cards in this system are managed through a separate internal system (`gift_card_orders` table, `GiftCardManager` component) — they don't flow through POS product transactions.

### The Problem
Since gift cards aren't in POS data, we can't categorize them the same way as products/merch/extensions. However, we have two options:

1. **Pattern-match on item names** — add a `isGiftCardProduct()` pattern (`gift.?card|voucher|gift.?cert`) to catch any future POS gift card sales alongside the existing categories
2. **Query gift card orders** — pull from the `gift_card_orders` table to show gift card revenue from the internal system

### Proposed Approach
Add `isGiftCardProduct()` to `serviceCategorization.ts` and a fourth category row in the retail breakdown. This keeps it consistent with the existing pattern and will automatically pick up gift card items if/when they appear in POS data. The pattern would match: `gift.?card|voucher|gift.?cert|gift.?certificate`.

### Changes

**`src/utils/serviceCategorization.ts`**
- Add `isGiftCardProduct()` with pattern: `/gift.?card|voucher|gift.?cert|gift.?certificate/i`
- Categorization priority becomes: Extension > Gift Card > Merch > Product

**`src/hooks/useRetailBreakdown.ts`**
- Add `giftCardRevenue` and `giftCardCount` to `RetailBreakdownData`
- Add gift card bucket to the classification loop (checked after extensions, before merch)

**`src/components/dashboard/AggregateSalesCard.tsx`**
- Add Gift Cards row to the `subCategories` array with a `Gift` icon (from lucide)
- Only shows when gift card revenue > 0 (same filter as other categories)

### Files
1. `src/utils/serviceCategorization.ts` — add `isGiftCardProduct()`
2. `src/hooks/useRetailBreakdown.ts` — add gift card bucket
3. `src/components/dashboard/AggregateSalesCard.tsx` — add Gift Cards sub-row

