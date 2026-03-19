

# Supply Cost Recovery Analytics — Conditional KPI + Settings Toggle

## Analysis of Your Idea

This is a strong feature. The key insight: only salons that actually charge clients for product usage (via allowance overages or parts-and-labor billing) should see recovery metrics. Surfacing these KPIs universally would confuse salons that don't bill for supplies.

## Gaps & Considerations

1. **Data source is already there.** `checkout_usage_charges` stores every charge (overage + product_cost types) with amounts and statuses (pending/approved/waived). We just need to aggregate.

2. **"Enabled" signal.** Currently there's no single boolean "we charge for supplies." The signal is implicit: the org has active `service_allowance_policies` with billing_mode set, AND/OR has a `backroom_billing_settings` row. We should add an explicit `enable_supply_cost_recovery` boolean to `backroom_billing_settings` so there's a clear toggle, rather than inferring from policy existence.

3. **Waived charges.** Need to decide: do waived charges count as "lost recovery" or are they excluded? Recommend showing approved charges as "Recouped" and waived as "Waived" so owners see the full picture.

4. **Setup wizard gap.** The current 6-step wizard (Products → Services → Formulas → Allowances → Stations → Alerts) doesn't mention billing configuration. Adding a "Billing" step after Allowances makes sense — it's where they'd toggle on supply cost recovery and set markup %.

5. **Recovery rate metric.** Raw "$X recouped" is less useful without context. The most actionable KPI is **Recovery Rate = (Charges Collected / Total Product Cost Dispensed) × 100%**. This tells owners what percentage of their supply spend is being passed through to clients.

## Plan

### 1. Database Migration
Add `enable_supply_cost_recovery` boolean column to `backroom_billing_settings`:
```sql
ALTER TABLE backroom_billing_settings
  ADD COLUMN enable_supply_cost_recovery boolean NOT NULL DEFAULT false;
```

### 2. Update `useBackroomBillingSettings` hook
Add `enable_supply_cost_recovery` to the `BackroomBillingSettings` interface and the upsert mutation.

### 3. Create `useSupplyCostRecovery` hook
New hook that queries `checkout_usage_charges` for the date range and computes:
- **Total Recouped** — sum of `charge_amount` where `status = 'approved'`
- **Total Waived** — sum where `status = 'waived'`
- **Total Pending** — sum where `status = 'pending'`
- **Recovery Rate %** — recouped / total dispensed cost (from analytics data)
- **Overage Revenue** vs **Product Cost Revenue** breakdown (by `charge_type`)

Only enabled when `enable_supply_cost_recovery` is true.

### 4. Add KPI tile to Command Center
In `BackroomDashboardOverview.tsx`, conditionally render a 6th KPI tile "Supply Recovery" showing the recovery rate %, with a drill-down showing recouped $ and waived $. The tile only appears when the billing setting flag is on.

### 5. Add to `useBackroomDashboard` composition hook
Wire `useSupplyCostRecovery` into the dashboard hook and expose `supplyCostRecovery` data alongside existing KPIs.

### 6. Add toggle in Allowances & Billing settings
In `AllowancesBillingSection.tsx`, add a "Charge clients for supply costs" toggle with subtitle explaining the feature. When toggled on, show the existing markup % and charge label fields.

### 7. Add "Billing" step to Setup Wizard
In `useBackroomSetupHealth.ts` and `useBackroomDashboard.ts`, add a 7th setup step: `{ label: 'Billing', done: billingConfigured }` where `billingConfigured` = the `backroom_billing_settings` row exists with `enable_supply_cost_recovery = true` OR at least one active allowance policy exists with billing_mode set.

### Files to Edit
1. **Migration** — add column to `backroom_billing_settings`
2. `src/hooks/billing/useBackroomBillingSettings.ts` — add field to interface + upsert
3. **New** `src/hooks/backroom/useSupplyCostRecovery.ts` — aggregation hook
4. `src/hooks/backroom/useBackroomDashboard.ts` — wire in recovery data + add Billing setup step
5. `src/hooks/backroom/useBackroomSetupHealth.ts` — add billing step check
6. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — conditional 6th KPI tile
7. `src/components/dashboard/backroom-settings/AllowancesBillingSection.tsx` — add toggle UI

