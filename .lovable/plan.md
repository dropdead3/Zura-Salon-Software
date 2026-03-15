

# Gaps and Enhancements to Consider Before Executing

## 1. No org-level default markup fallback

The plan relies on per-product `markup_pct`, but many salons won't have set markup on every product. If a product has `markup_pct = NULL`, the charge falls to wholesale cost (0% markup), which is likely not what the owner intended.

**Suggestion:** Add a `backroom_billing_settings` table with `default_product_markup_pct` so orgs can set a fallback (e.g., 40%). The charge calculation cascades: per-product markup → org default → 0%.

## 2. Tax handling for product charges

The `CheckoutSummarySheet` already calculates tax on the service subtotal. Product cost charges are a separate line item — should they be taxed? In most US jurisdictions, product used during a service is part of the service and is taxable. But some states treat it as a separate retail sale with different tax rules.

**Suggestion:** Add a `product_charge_taxable` boolean to `backroom_billing_settings` (default `true`). Wire it into the checkout total calculation so product charges are included in the tax base when applicable.

## 3. Receipt PDF doesn't include product charges

The `generateReceiptPdf()` function in `CheckoutSummarySheet` hardcodes service + add-ons + tip. Product cost charges won't appear on the printed receipt unless we explicitly add them.

**Suggestion:** Include product charges as a line item in the PDF between Add-Ons and Payment Summary sections.

## 4. Promo codes could discount product charges unintentionally

The existing `PromoCodeInput` applies discounts to the subtotal. If product charges are folded into the subtotal, a "20% off" promo would also discount the product cost — eating into the salon's cost recovery.

**Suggestion:** Keep product charges separate from the promo-discountable subtotal. Show them as a distinct "Product Usage" section after the discount line but before tax. This preserves full cost recovery.

## 5. No client-facing transparency on what "Product Cost" means

The plan shows a line item in the booking wizard, but clients seeing "Product Cost (est.)" for the first time may be confused or frustrated. Front desk staff need a script.

**Suggestion:** Add a configurable `product_charge_label` to `backroom_billing_settings` (e.g., "Color Materials", "Professional Products Used", "Product Fee"). Default to "Product Usage". This lets each salon brand it appropriately.

## 6. Multi-service appointments aren't addressed

An appointment can have multiple services (via `appointment_service_assignments`). The plan's estimate hook takes service IDs but the checkout flow currently treats `appointment.service_name` as a single service. Product charges need to aggregate across all services in the appointment.

**Suggestion:** Ensure `useEstimatedProductCharge` and the checkout charge calculation iterate over all assigned services, not just the primary `service_id`.

## 7. No "Parts & Labor" visibility indicator for clients during online booking

If the salon has a client-facing booking flow, there's no indication that product costs will be added. Clients could be surprised at checkout.

**Suggestion:** When a service uses `parts_and_labor` billing, add a small note on the service card: "Product usage fee applies" — configurable via the billing settings.

## 8. Missing guardrail: What if recipe baselines don't exist?

If a service is set to `parts_and_labor` but has no `service_recipe_baselines`, the estimated charge will be $0.00 — misleading. At checkout, the actual charge from mix bowls could be significant.

**Suggestion:** When `parts_and_labor` is active but no baselines exist, show "Product fee applies (estimate unavailable)" instead of "$0.00". Log a warning in the Backroom setup checklist.

---

## Recommended additions to the plan

| Enhancement | Priority | Effort |
|---|---|---|
| Org-level default markup fallback | High | Small — one new table + cascade logic |
| Exclude product charges from promo discounts | High | Small — separate subtotal line |
| Receipt PDF includes product charges | High | Small — add section to `generateReceiptPdf` |
| Tax configurability for product charges | Medium | Small — boolean setting + conditional |
| Configurable client-facing label | Medium | Tiny — one column |
| Multi-service aggregation | High | Medium — loop over assignments |
| Baseline-missing guardrail | Medium | Tiny — conditional display |
| Online booking transparency note | Low | Small — conditional badge |

I'd recommend folding enhancements 1-6 into the plan before executing, as they prevent real billing errors. Items 7-8 can be follow-ups. Want me to update the plan with these included?

