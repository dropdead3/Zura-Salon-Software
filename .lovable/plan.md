

# Wire Promo Redemption History to Live Data

## Problem

The Transactions tab has a "Promo History" toggle that renders `PromoRedemptionList`, but it passes `redemptions={[]}` -- hardcoded empty. The hook `useTransactionPromoDetails` already exists and queries `promotion_redemptions` joined with `promotions`, but it is never called.

## Changes

### 1. `src/pages/dashboard/AppointmentsHub.tsx` -- TransactionsTab component

- Import `useTransactionPromoDetails` and the organization context (`useOrganization` or equivalent)
- Call `useTransactionPromoDetails` with `organizationId` and the current date range from the existing `getDateRange()` logic
- Pass the returned `data` and `isLoading` into `PromoRedemptionList` instead of the hardcoded empty array

**Before (line ~260):**
```tsx
<PromoRedemptionList redemptions={[]} isLoading={false} />
```

**After:**
```tsx
<PromoRedemptionList redemptions={promoRedemptions} isLoading={promoLoading} />
```

### 2. No other files need changes

The hook, the component, and the transaction-row promo badges are all already built. This is a single-file wiring fix.

## Technical Details

- The `useTransactionPromoDetails` hook accepts `{ organizationId, startDate, endDate }` and queries `promotion_redemptions` joined with `promotions` for name/code resolution
- Organization ID will come from the existing `useOrganization()` / `OrganizationContext` pattern used elsewhere in the codebase
- Date range reuses the same `getDateRange()` helper already in `TransactionsTab`
