

# Billing Economics Overhaul

## Confirmed Pricing Model

| Tier | Base | Included Users | Extra Users | Max Users |
|------|------|---------------|-------------|-----------|
| **Operator** (1 loc) | $99/mo flat | 1 | +$25/ea | 4 total |
| **Growth** (2-5 loc) | $200/mo per location | 10 per loc | +$25/ea | No cap |
| **Infrastructure** (5+ loc) | $200/mo per location | 10 per loc | +$25/ea | No cap |
| **Enterprise** | $200/loc baseline, negotiable | Custom | Custom | Custom |

- Monthly billing only — no cycle discounts
- 14-day free trial
- $199 setup fee (waivable)
- Backroom add-on unchanged

---

## 1. Update `subscription_plans` data (4 UPDATEs)

Update the 4 existing rows to match new tiers:

| Current → New | tier | price_monthly | price_annually | max_locations | max_users | description |
|---|---|---|---|---|---|---|
| Starter → Operator | `operator` | 99 | 0 | 1 | 4 | "Single-location operators. 1 user included, up to 3 additional at $25/mo each." |
| Standard → Growth | `growth` | 200 | 0 | 5 | -1 | "Scaling brands, 2-5 locations. $200/mo per location, 10 users per location included." |
| Professional → Infrastructure | `infrastructure` | 200 | 0 | -1 | -1 | "Regional brands, 5+ locations. Per-location pricing with deep operational features." |
| Enterprise → Enterprise | `enterprise` | 0 | 0 | -1 | -1 | "Custom pricing for chains & PE-backed brands. $200/loc baseline, negotiable." |

Also update the `features` JSON and `name` fields accordingly.

## 2. `useBillingCalculations.ts`

- Set all `CYCLE_DISCOUNTS` to 0 (or remove the object, keep only `monthly: 0`)
- Simplify `BillingCycle` usage — keep type but default everything to `monthly`
- Remove cycle discount math from the calculation (lines 124-130 simplify to `cycleAmount = effectiveMonthly`)
- Keep promo, trial, setup fee, and per-user/per-location fee logic intact — it already works correctly
- Remove `getBillingCycleLabel` multi-option or simplify to always return "Monthly"

## 3. `useOrganizationBilling.ts`

- Simplify `BillingCycle` type to just `'monthly'` (keep as union type for backwards compat but document monthly-only)
- No structural changes needed — the interface already supports all required fields

## 4. `useOrganizationCapacity.ts`

- Add tier-aware logic: when plan tier is `operator`, hard cap users at 4; for `growth`/`infrastructure`, calculate included users as `10 × locationCount` and compare against actual usage
- Pass plan tier into `calculateCapacity`

## 5. `BillingGuide.tsx` — Major content overhaul

- **Plans table**: Replace "Annual Effective" column with "Per-Location Rate" and "Included Users" columns. Show $99 flat for Operator, $200/loc for Growth/Infrastructure.
- **Remove "Billing Cycle Discounts" section entirely** (the `discounts` card and its nav entry)
- **Update "How Billing Works"** steps: Remove "Cycle Discount" step. Update "Base Price" to explain per-location model. Add step explaining tier auto-detection (1 loc = Operator, 2-5 = Growth, 5+ = Infrastructure).
- **Update calculator widget**: Remove cycle selector. Auto-detect tier from location count input. Show: `locations × rate + extra users × $25 + setup fee`.
- **Update Quick Reference**: Remove contract length options beyond month-to-month. Update to reflect monthly-only billing.
- **Add changelog entry** for this restructure.
- **Remove `discounts` from SECTIONS** nav array.

## 6. `PlanSelector.tsx`

- Show per-location pricing for Growth/Infrastructure (e.g. "$200/location/mo")
- Show "1 user included" for Operator, "10 users/location" for multi-loc tiers
- Handle Enterprise as "Contact Sales"

## 7. `BillingStatusCard.tsx`

- Remove billing cycle display (or hardcode to "Monthly")
- Remove cycle savings banner (savingsAmount will always be 0)
- Keep promo and trial banners

---

## Files Changed

1. **Data update** — 4 `UPDATE` statements on `subscription_plans`
2. `src/hooks/useBillingCalculations.ts` — Remove cycle discounts, simplify
3. `src/hooks/useOrganizationBilling.ts` — Simplify BillingCycle type
4. `src/hooks/useOrganizationCapacity.ts` — Tier-aware user limits
5. `src/pages/dashboard/platform/BillingGuide.tsx` — Full content overhaul
6. `src/components/platform/billing/PlanSelector.tsx` — Per-location display
7. `src/components/platform/billing/BillingStatusCard.tsx` — Remove cycle references

