

# Dock-to-Checkout Pipeline Audit

## Critical Bugs

### 1. Add-ons fetched but never included in checkout totals

`CheckoutSummarySheet` lines 147-155: `addonTotal` is computed from `booking_addon_events`, but it is **never added** to `discountedSubtotal`, `taxableBase`, `checkoutTotal`, or `grandTotal`. The add-on section renders visually (lines 496-534) with an "Add-On Subtotal" label, but the actual payment summary ignores it entirely. Clients with add-ons are undercharged.

**Fix:** Include `addonTotal` in the checkout math:
```
const checkoutTotal = discountedSubtotal + addonTotal + allUsageChargeTotal + tax;
```
And update `taxableBase` to include add-ons if they're taxable.

### 2. `organizationId` not passed to `CheckoutSummarySheet` from Schedule page

`Schedule.tsx` line 827-843: The `CheckoutSummarySheet` component accepts an `organizationId` prop (used for promo code validation and billing settings lookup), but the Schedule page **does not pass it**. This means:
- `PromoCodeInput` never renders (gated behind `organizationId && (...)` on line 574)
- `useColorBarBillingSettings(undefined)` returns nothing — billing label and tax settings fall back to defaults
- `useCheckoutUsageCharges(appointmentId)` still works (no org filter), but billing config is broken

**Fix:** Pass `organizationId={effectiveOrganization?.id}` to the `CheckoutSummarySheet` in `Schedule.tsx`.

### 3. Same missing `organizationId` in `TodaysQueueSection`

`TodaysQueueSection.tsx` line 304-344: Same issue — `CheckoutSummarySheet` rendered without `organizationId`. Promo codes and billing settings are broken here too.

**Fix:** Pass `organizationId` prop.

## Medium Bugs

### 4. Receipt PDF hardcodes `$` — ignores `useFormatCurrency`

The checkout UI correctly uses `formatCurrency()` for all monetary displays. But `generateReceiptPDF` (lines 219-398) hardcodes `$${amount.toFixed(2)}` throughout (~10 occurrences). Multi-currency organizations get `$` on receipts regardless of their configured currency.

**Fix:** Use `formatCurrency()` (already available in scope) for all receipt PDF monetary values instead of `$${...toFixed(2)}`.

### 5. Receipt PDF omits add-ons entirely

The receipt PDF renders Service, Product Charges, Overage Charges, Subtotal, Tax, and Total — but add-on events are never printed. Even if bug #1 is fixed (add-ons included in total), the receipt won't show the individual add-on line items.

**Fix:** Add an "Add-Ons" section to the receipt PDF between Service and Product Charges.

### 6. Receipt PDF omits discount/promo line

If a promo code is applied (`appliedPromo` is set), the discount is included in the total math but never printed on the receipt. The client sees a lower total with no explanation.

**Fix:** Add a "Discount" line to the receipt when `discount > 0`.

### 7. Overage charges not taxed correctly in checkout math

Line 152: `taxableBase = discountedSubtotal + (productChargeTaxable ? allUsageChargeTotal : 0)`. The `productChargeTaxable` flag controls whether **all** usage charges (both product_cost AND overage) are taxed. But overage charges (allowance-mode surcharges) may have different tax treatment than product cost charges. Currently they're lumped together under one flag.

**Fix:** Either rename the flag to clarify it covers both charge types, or add a separate `overage_charge_taxable` setting. For now, document the behavior clearly.

### 8. Idempotency guard uses `service_name` equality — empty string vs null mismatch

`useCalculateOverageCharge` line 69: `.eq('service_name', serviceName ?? '')`. If a charge was inserted with `service_name: null` (line 177: `serviceName ?? null`), the guard checks `.eq('service_name', '')` which won't match `null` in Postgres (`null != ''`). This allows duplicate charges when `serviceName` is undefined.

**Fix:** Use `.is('service_name', null)` when `serviceName` is falsy, or standardize to always store empty string instead of null.

### 9. `handleCheckoutConfirm` doesn't persist promo result

`Schedule.tsx` line 507-516: `handleCheckoutConfirm` receives `promoResult` but only passes `tip_amount`, `rebooked_at_checkout`, and `rebook_declined_reason` to `handleStatusChange`. The applied promo code and discount amount are **never persisted** to the database. After checkout, there's no record of which promo was used or how much was discounted.

**Fix:** Either pass promo data through `handleStatusChange` options to the update mutation, or insert a separate `applied_promotions` record.

## Low Severity

### 10. `TodaysQueueSection` checkout missing `onScheduleNext` and `rebookCompleted`

The rebooking gate (next visit recommendation) works on the Schedule page but is completely absent from the Today's Queue checkout path — `onScheduleNext` and `rebookCompleted` are not passed. Clients checked out from the dashboard skip the rebooking capture.

**Fix:** Wire up `onScheduleNext` and `rebookCompleted` in `TodaysQueueSection`, or document that rebooking is Schedule-only.

### 11. Receipt preview popup-blocked silently

Line 393: `window.open(url, '_blank')` with no null check. If blocked, no feedback.

**Fix:** Add toast fallback (same pattern as the Transactions receipt fix from Round 3).

## Summary

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **Critical** | Add-ons not included in checkout total | Add `addonTotal` to checkout math |
| 2 | **Critical** | `organizationId` missing from Schedule→Checkout | Pass prop |
| 3 | **Critical** | `organizationId` missing from TodaysQueue→Checkout | Pass prop |
| 4 | **Medium** | Receipt PDF hardcodes `$` | Use `formatCurrency()` |
| 5 | **Medium** | Receipt PDF omits add-on line items | Add add-ons section |
| 6 | **Medium** | Receipt PDF omits discount/promo line | Add discount line |
| 7 | **Medium** | Overage + product charges share one tax flag | Clarify or split |
| 8 | **Medium** | Idempotency guard null vs empty string | Fix null handling |
| 9 | **Medium** | Applied promo never persisted to DB | Store promo record |
| 10 | **Low** | TodaysQueue checkout skips rebooking gate | Wire props or document |
| 11 | **Low** | Receipt preview popup-blocked silently | Add toast fallback |

### Files to edit

| File | Changes |
|------|---------|
| `CheckoutSummarySheet.tsx` | Fix add-on math; fix receipt PDF (currency, add-ons, discount, popup); clarify tax logic |
| `Schedule.tsx` | Pass `organizationId` to CheckoutSummarySheet; persist promo result |
| `TodaysQueueSection.tsx` | Pass `organizationId`; optionally wire rebooking props |
| `useCalculateOverageCharge.ts` | Fix idempotency guard null/empty mismatch |

