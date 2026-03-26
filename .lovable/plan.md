

## Analysis: Current Allowance System vs Vish-Style Calculator — Gaps & Improvements

### Current Architecture (3 disconnected pieces)

```text
┌─────────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────┐
│ service_recipe_baselines│    │ service_allowance_policies│    │  allowance_buckets  │
│ (expected product usage)│    │  (abstract weight + rate) │    │ (sub-policy tiers)  │
│ product_id, qty, unit   │    │  included_qty: 30g        │    │ "Color": 30g, $0.50 │
│ per service — flat list │    │  overage_rate: $0.50/g    │    │ "Lightener": 45g    │
│ NO bowl grouping        │    │  NO product cost link     │    │ Has dev ratio UI    │
└─────────────────────────┘    └──────────────────────────┘    └─────────────────────┘
         ↑ not connected ↑              ↑ not connected ↑
```

### What Vish Does Differently (unified model)

```text
┌───────────────────────────────────────────────────────┐
│              PRODUCT ALLOWANCE CALCULATOR              │
│                                                        │
│  Bowl 1:                                               │
│    Powder Lightener     90g × $0.17/g = $15.66        │
│    5 Vol Developer      2× ratio      = $4.03         │
│                              Bowl Total: $19.69        │
│  Bowl 2:                                               │
│    10-32 Gold Violet    60g × $0.26/g = $15.79        │
│    Gloss Toner Dev      1× ratio      = $1.03         │
│                              Bowl Total: $16.82        │
│                                                        │
│              PRODUCT ALLOWANCE: $36.51   [SAVE]        │
└───────────────────────────────────────────────────────┘
```

The recipe IS the allowance. Products × quantities × cost/g = dollar allowance.

### 7 Gaps Identified

| # | Gap | Severity | Detail |
|---|-----|----------|--------|
| 1 | **No bowl grouping in baselines** | High | `service_recipe_baselines` is a flat list per service. Vish groups products into bowls (Bowl 1, Bowl 2). No way to model multi-bowl compositions. |
| 2 | **Weight-based, not cost-based allowance** | High | Policy stores `included_allowance_qty` (grams). Vish derives a **dollar** allowance from product costs. Our billing engine operates on weight, not dollars. |
| 3 | **Recipe and policy are disconnected** | High | Recipe baselines don't feed into allowance policies. Setting a 30g allowance is arbitrary — it's not derived from what products actually cost. |
| 4 | **No product cost lookup in allowance setup** | Medium | The inline editor (15g/30g pills) doesn't reference catalog cost_per_gram. Users can't see dollar implications of their choices. |
| 5 | **Developer ratio not tied to recipes** | Medium | `AllowancesBillingSection` has 1×/1.5×/2× buttons but they only affect bucket `included_quantity` — not linked to actual developer products from the catalog. |
| 6 | **No visual bowl builder** | Medium | Vish shows a visual bowl fill with product/developer cost breakdown. We have nothing comparable. |
| 7 | **Inline editor too simplistic** | Low | The drill-down quick-set (weight pills + overage) works for MVP but doesn't scale to the recipe-driven model. |

### Recommended Implementation Path

**Phase 1 — Data model: Add bowl grouping to recipe baselines**
- Add a `service_allowance_bowls` table: `id, policy_id, bowl_number, label`
- Add `bowl_id` FK to `service_recipe_baselines` (nullable for backward compat)
- Add `cost_per_unit_snapshot` to baselines so dollar totals can be computed

**Phase 2 — Allowance Calculator Dialog**
- New `AllowanceCalculatorDialog` component, opened from the service drill-down
- Multi-bowl support with "Add Bowl" / remove
- Product picker pulling from org catalog (products table) with swatch, name, brand, cost/g
- Weight quick-sets per product (15g, 30g, 60g, 90g) + custom input
- Developer ratio buttons (1×, 1.5×, 2×, Custom) that auto-add developer product
- Per-bowl cost subtotals (Product $ + Developer $)
- Grand total = Product Allowance (dollar amount)
- Save writes to `service_recipe_baselines` (with bowl grouping) AND updates `service_allowance_policies` with the computed dollar allowance

**Phase 3 — Billing engine alignment**
- Support `allowance_unit: '$'` in addition to `'g'` so the billing engine can compare actual dispensed cost vs allowed cost
- Update `calculateOverageCharge` to handle dollar-based allowances
- Update checkout projection writes accordingly

**Phase 4 — Visual polish**
- Bowl fill visualization (SVG or CSS gradient) showing product layers
- Per-bowl cost breakdown sidebar (matching Vish layout)
- Summary footer with grand total + Save CTA

### Files Affected
- New migration: `service_allowance_bowls` table + `bowl_id` on baselines + `cost_per_unit_snapshot`
- New component: `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`
- Modified: `ServiceTrackingSection.tsx` — replace inline editor with "Configure Allowance" button that opens dialog
- Modified: `AllowancesBillingSection.tsx` — surface bowl-grouped view in expanded policy
- Modified: `src/lib/backroom/allowance-billing.ts` — support dollar-based allowance mode
- Modified: `src/hooks/billing/useServiceAllowancePolicies.ts` — add computed dollar total field
- Modified: `src/hooks/inventory/useServiceRecipeBaselines.ts` — support bowl_id filtering

