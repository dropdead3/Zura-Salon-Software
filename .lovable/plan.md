
# Discount and Promo Tracking in Appointments & Transactions Hub

## Current State

The platform already has a robust promotion system: `promotions` table, `promotion_redemptions` (tracking each use with `discount_applied`, `promo_code_used`, `transaction_id`), `promotion_variants`, and front-end validation/redemption hooks. The `phorest_transaction_items` table has a `discount` column but no foreign key linking to which promotion caused the discount.

The Hub currently shows none of this information.

## What This Adds

### A. Database: Link Transaction Items to Promotions

Add `promotion_id UUID REFERENCES promotions(id)` to `phorest_transaction_items` so each discounted line item can trace back to the specific promotion.

### B. Transactions Tab: Discount Visibility

- Display the `discount` column value inline on each transaction row (already stored, just not rendered)
- If a `promotion_id` is set, show the promo name + code as a small badge on the row
- Add a "Discounted Only" toggle filter that filters to rows where `discount > 0`
- Add a discount summary stat card at the top: **Total Discounts Given** for the filtered period

### C. Promo Redemption History Sub-Tab

Add a **Promotions** sub-section within the Transactions tab (or as a collapsible panel) that queries `promotion_redemptions` for the organization and displays:
- Promo code used, promotion name, client name, discount applied, original amount, final amount, date
- Links back to the transaction row when clicked

### D. Appointment Detail Drawer: Promo Context

When viewing the "Checkout Details" section of an appointment, if the linked transaction has a `promotion_id` or a matching `promotion_redemptions` record, show:
- Promo name and code
- Discount amount applied
- Original vs final price

### E. Export Enhancement

CSV export for Transactions will include `discount`, `promo_code`, and `promotion_name` columns.

---

## Technical Details

### Migration

```sql
ALTER TABLE public.phorest_transaction_items
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_phorest_transaction_items_promotion
  ON public.phorest_transaction_items(promotion_id);
```

### New Hook: `useTransactionPromoDetails.ts`

Fetches `promotion_redemptions` joined with `promotions` for a given organization + optional date range. Returns promo name, code, discount applied, client info.

### Modified Files

| File | Change |
|------|--------|
| `src/pages/dashboard/AppointmentsHub.tsx` | Add discount summary stat card to Transactions tab; add "Discounted Only" filter toggle |
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Show promo badge + discount in checkout section when promotion linked |
| `src/hooks/useTransactions.ts` | Include `promotion_id` in queries; join promotion name for display |
| `src/hooks/useTransactionPromoDetails.ts` | New hook for redemption history queries |

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useTransactionPromoDetails.ts` | Query promotion_redemptions with promotion name resolution |
| `src/components/dashboard/appointments-hub/PromoRedemptionList.tsx` | Redemption history table within Transactions tab |
