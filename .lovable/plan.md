
## Compensation model expansion — beyond stylist-levels

### Where we are today

Single doctrine: every staff member maps to a `stylist_level` with a fixed `service_commission_rate` + `retail_commission_rate`. `useResolveCommission` reads that level → returns rates. `stylist_commission_overrides` lets admins one-off override per user. That's it.

That covers ~one industry pattern (level-based career ladder, e.g. Drop Dead). It misses the majority of how commission salons actually pay.

### What real commission salons do (industry reality)

Six structurally distinct compensation patterns we're not modeling:

| Model | How it works | Who uses it |
|---|---|---|
| **1. Flat % commission** (already supported via Level 1 default) | One rate for everyone, no ladder | Small salons, suite-rentals offering a desk |
| **2. Sliding-scale by pay-period earnings** | Bracket: $0–3k = 40%, $3–5k = 45%, $5k+ = 50%. Resets each pay period | Most mid-size commission salons (Aveda concept salons, JCP, Ulta) |
| **3. Sliding-scale by trailing avg** | Same brackets but uses 4-week or 13-week trailing average to set rate for the period — prevents whipsaw | Premium independents |
| **4. Hourly + commission (whichever is higher)** | Guaranteed hourly wage; commission only paid if it exceeds hours × rate. CA/NY compliance default | California, New York mandates |
| **5. Hourly + commission stacked** | Hourly base + lower % on top (e.g. $15/hr + 25% on services > $0) | Apprentice programs, training salons |
| **6. Team / pooled commission** | All service revenue from a team (e.g. assistants under a master) split by hours worked or fixed % | Master-stylist studios with assistants |
| **7. Service-category rate** | Different rate for color vs cut vs extensions vs treatments | Specialty salons (color bars, extension bars) |
| **8. Booth/chair rental hybrid** | Stylist pays $X/wk rent, keeps 100% above; or rent + reduced commission | Suite-style, transitional models |

Plus orthogonal rules every model needs:
- **Product cost deduction** — commission paid on (service revenue – chemical/back-bar cost)
- **Tip handling** — direct to stylist vs pooled vs withheld for tax remit
- **Refund clawback** — if a service is refunded after payout, deduct from next period
- **Discount handling** — commission on gross (pre-discount) or net (post-discount) — a real fight
- **Add-on commission** — gloss/treatment add-ons paid same as parent service or separate

### Proposed architecture

#### 1. Introduce `compensation_models` as the new top-level concept

`stylist_levels` becomes one *kind* of compensation model — not the only one. New table:

```
compensation_plans (org-scoped)
  id, organization_id, name, slug, plan_type, is_active
  plan_type: 'level_based' | 'flat_commission' | 'sliding_period' | 'sliding_trailing'
           | 'hourly_vs_commission' | 'hourly_plus_commission'
           | 'team_pooled' | 'category_based' | 'booth_rental'
  config: jsonb  // shape varies by plan_type
  
  // Universal modifiers (apply to any plan_type)
  commission_basis: 'gross' | 'net_of_discount' | 'net_of_product_cost'
  tip_handling: 'direct' | 'pooled' | 'withheld_for_payout'
  refund_clawback: boolean
  addon_treatment: 'same_as_parent' | 'separate_rate' | 'no_commission'
```

Each user assigned to a plan via `user_compensation_assignments` (replaces the implicit "stylist_level on profile" coupling). Existing stylist-level orgs migrate cleanly: their level becomes a `level_based` plan with the existing rate ladder in `config`.

#### 2. Plan-type config shapes (JSONB, validated by Zod)

- `flat_commission`: `{ service_rate: 0.45, retail_rate: 0.10 }`
- `sliding_period`: `{ brackets: [{min: 0, max: 3000, rate: 0.40}, {min: 3000, max: 5000, rate: 0.45}, {min: 5000, rate: 0.50}], retail_rate: 0.10 }`
- `sliding_trailing`: same brackets + `{ window_weeks: 4 | 13 }`
- `hourly_vs_commission`: `{ hourly_rate: 18, service_rate: 0.40, retail_rate: 0.10 }` — payroll picks max(hours×rate, commission)
- `hourly_plus_commission`: `{ hourly_rate: 15, service_rate: 0.25, retail_rate: 0.10 }` — sums both
- `team_pooled`: `{ pool_id: uuid, split_method: 'hours_worked' | 'fixed_pct', members: [{user_id, pct?}] }`
- `category_based`: `{ rates_by_category: {color: 0.50, cut: 0.40, extensions: 0.55, treatment: 0.45}, retail_rate: 0.10 }`
- `booth_rental`: `{ weekly_rent: 300, commission_above_rent: 0 | 0.10 }`

#### 3. Resolver becomes plan-aware

`useResolveCommission` evolves into `resolveCommissionForPlan(plan, context)` where context includes:
- pay-period sales-to-date (for sliding_period)
- trailing window sales (for sliding_trailing)
- hours worked (for hourly variants)
- service categories breakdown (for category_based)
- chemical cost (for net_of_product_cost basis)

Returns the same shape (`{ serviceCommission, retailCommission, totalCommission, sourceName, breakdown }`) so downstream consumers (`useStaffCompensationRatio`, `usePayrollForecasting`, payroll exports) need only a thin update.

#### 4. Settings UX — Compensation Hub

New surface at `/dashboard/admin/compensation` (or absorbed into Operations Hub → Pay structure):

- **Plans tab**: list of compensation plans for the org with type, # of staff assigned, status
- **Create plan wizard**: pick plan_type → guided config (brackets editor, hourly+rate input, category-rate matrix, etc.) → universal modifiers → assign staff
- **Assignments tab**: bulk-assign or per-staff plan picker; effective-dated changes
- **Simulator**: paste a hypothetical $/hours scenario, see what each plan would pay — critical for owners changing models

Keep `StylistLevels.tsx` page as the editor *for* `level_based` plans (no scrap, just relabel).

#### 5. Policy implications (ties to the wizard work in flight)

Each plan_type unlocks/requires different policies:
- `hourly_vs_commission` + CA/NY operating state → mandatory wage-statement policy + meal-break tracking
- `team_pooled` → tip-pool policy required (FLSA section 3(m) — owners/managers cannot share)
- `booth_rental` → 1099 vs W-2 classification policy + chair-rental agreement template
- `sliding_*` with refund_clawback → wage-deduction authorization policy (state-restricted)
- `commission_basis = net_of_product_cost` → product-cost transparency disclosure to staff (some states require)

`policy_org_profile` gains:
```
compensation_models_in_use: text[]  // ['hourly_vs_commission', 'team_pooled']
commission_basis_in_use: text[]
uses_tip_pooling: boolean
uses_refund_clawback: boolean
has_booth_renters: boolean
```

`isApplicableToProfile` extends to filter recommended policies by compensation model — same applicability doctrine, new dimension.

#### 6. Payroll forecasting + analytics impact

`usePayrollForecasting` already projects per-employee compensation. Update it to:
- Read the assigned plan instead of hardcoded level rate
- Pass period-to-date sales when resolving sliding plans
- For `hourly_*`, multiply scheduled hours by hourly_rate as a baseline floor
- For `team_pooled`, project at the pool level then split

`useTierDistribution` becomes `usePlanDistribution` — same shape but groups by plan rather than level. Level-based orgs see the existing tier breakdown; sliding-scale orgs see "$0–3k bracket: 4 staff, $3–5k: 6 staff, $5k+: 2 staff" with current period-to-date positions.

### What we'd build (sequenced)

**Wave 1 — Foundation (this wave)**
1. Migration: `compensation_plans`, `user_compensation_assignments`, RLS, indexes
2. Backfill: every org with stylist levels gets one auto-generated `level_based` plan; users assigned by their current level
3. Plan-aware resolver alongside existing `useResolveCommission` (dual-path until parity verified)
4. Compensation Hub list view + plan-type picker

**Wave 2 — Plan editors**
5. Editor UIs per plan_type (brackets editor, hourly+rate, category matrix, pool builder, rental terms)
6. Universal modifiers UI (basis, tips, clawback, addon treatment)
7. Effective-dated assignment editor
8. Simulator

**Wave 3 — Downstream + policy**
9. Wire `usePayrollForecasting`, `useStaffCompensationRatio`, `useTierDistribution` to plan-aware resolver
10. Policy applicability extension (compensation-model-driven recommendations)
11. Wizard Step 2 surfaces compensation_model toggles (auto-detected from `compensation_plans` in use)

**Wave 4 — Compliance polish**
12. State-aware enforcement (CA hourly floor, NY wage statements, FLSA tip-pool gates)
13. Refund clawback workflow + wage-deduction authorization capture
14. Product-cost-deduction transparency report

### Files & systems touched (high-level)

- DB: 2 new tables, RLS policies, backfill migration, possible deprecation flag on `stylist_levels` (kept, not dropped)
- Hooks: `useCompensationPlans`, `useUserCompensationAssignment`, plan-aware `resolveCommissionForPlan`, refactor `useResolveCommission` to delegate
- Components: `CompensationHub`, `CompensationPlanEditor`, `BracketsEditor`, `CategoryRateMatrix`, `PoolBuilder`, `RentalTermsEditor`, `CompensationSimulator`, `PlanAssignmentTable`
- Routes: `/dashboard/admin/compensation` + nav entry under Operations Hub → "Pay structure"
- Policy layer: extend `policy_org_profile` schema, extend `isApplicableToProfile`, add ~12 new policy keys (tip-pool agreement, wage-deduction auth, chair-rental agreement, 1099 classification, etc.)
- Forecasting: update 3 hooks (`usePayrollForecasting`, `useStaffCompensationRatio`, `useTierDistribution`)
- Memory: new doctrine entry `mem://features/payroll/compensation-plans-pluralism.md` codifying that level-based is one of N models, never the assumed default

### Decisions needed before building

1. **Scope of Wave 1** — do we ship all 8 plan types' editors, or start with the top 3 (level_based, sliding_period, hourly_vs_commission) which cover ~80% of US salons?
2. **Migration strategy** — auto-create `level_based` plans for every existing org silently, or surface a one-time "review your migrated plan" prompt?
3. **Compensation Hub placement** — standalone route or nested under Operations Hub → Pay structure (matches existing settings hub doctrine)?
4. **Stylist Levels page fate** — keep as-is (level-based-only editor), absorb into the new Compensation Hub as one plan type's editor, or deprecate the standalone page entirely?

Pick those four and I'll tighten the build order.
