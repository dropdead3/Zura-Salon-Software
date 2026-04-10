

# Dock-to-Checkout Pipeline Audit — COMPLETED

## Architecture Clarification

The Dock is a **prep station**, not a POS. It writes charges to `checkout_usage_charges`, which are consumed by the **Schedule page's `CheckoutSummarySheet`** (the front desk POS checkout). The Dock does not process payments.

## Fixes Applied

### Critical

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 1 | Add-ons not included in checkout total or tax base | Added `addonTotal` to `taxableBase` and `checkoutTotal` | ✅ Done |
| 2 | `organizationId` missing from Schedule→Checkout | Passed `organizationId={orgId}` | ✅ Done |
| 3 | `organizationId` missing from TodaysQueue→Checkout | Added `useOrganizationContext`, passed `organizationId` | ✅ Done |

### Medium

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 4 | Receipt PDF hardcodes `$` | Replaced all `$${...toFixed(2)}` with `formatCurrency()` | ✅ Done |
| 5 | Receipt PDF omits add-on line items | Added "Add-Ons" section to receipt PDF | ✅ Done |
| 6 | Receipt PDF omits discount/promo line | Added "Discount" line when discount > 0 | ✅ Done |
| 7 | Overage + product charges share one tax flag | Documented behavior in code comment; single flag covers both | ✅ Documented |
| 8 | Idempotency guard null vs empty string | Changed to `.is('service_name', null)` when serviceName is falsy | ✅ Done |
| 9 | Applied promo never persisted to DB | Added insert to `applied_promotions` table on checkout confirm | ✅ Done |

### Low

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 10 | TodaysQueue checkout skips rebooking gate | Documented as Schedule-only feature (TodaysQueue is a quick view) | ℹ️ By design |
| 11 | Receipt preview popup-blocked silently | Added null check + toast fallback | ✅ Done |

## Files Changed

| File | Changes |
|------|---------|
| `CheckoutSummarySheet.tsx` | Fixed add-on math in totals/tax; replaced all hardcoded `$` in receipt PDF with `formatCurrency()`; added add-on + discount sections to receipt; added popup-blocked toast |
| `Schedule.tsx` | Passed `organizationId={orgId}` to CheckoutSummarySheet; added promo persistence on checkout confirm |
| `TodaysQueueSection.tsx` | Added `useOrganizationContext` import; passed `organizationId` to CheckoutSummarySheet |
| `useCalculateOverageCharge.ts` | Fixed idempotency guard to use `.is('service_name', null)` for falsy service names |
