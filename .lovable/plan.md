

## Add Inline Allowance Configuration to Service Drill-Down

### Problem
The expanded service row shows "No allowance" with a tooltip pointing elsewhere, but Step 2 ("Set Allowances") implies it should be configurable here. There's a disconnect — users have to navigate away to set allowances.

### Solution
Add an inline allowance editor directly in the service drill-down row, replacing the passive "No allowance" indicator with an actionable quick-config panel.

### Technical Detail

**File: `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`**

1. **Import** `useServiceAllowancePolicies`, `useUpsertAllowancePolicy` from `@/hooks/billing/useServiceAllowancePolicies`, and `useOrganizationContext`.

2. **Fetch policies** at the component level:
   ```tsx
   const { data: allPolicies } = useServiceAllowancePolicies();
   ```

3. **Replace the "No allowance" indicator block** (lines ~674–682) with an inline allowance editor:

   - **If policy exists**: Show a compact summary (e.g., "30g included · $0.50/g overage") with an Edit button that reveals inline fields.
   - **If no policy**: Show a compact "Set Allowance" form with:
     - Quick-set weight buttons: `15g`, `30g`, `45g`, `60g`, `90g` (pill buttons, matching existing design patterns from AllowancesBillingSection)
     - Overage rate input (default `$0.50/g`)
     - A "Save" button that calls `useUpsertAllowancePolicy` with sensible defaults (`allowance_unit: 'g'`, `overage_rate_type: 'per_unit'`, `billing_mode: 'allowance'`)

4. **Update `hasAllowance` check** to use the fetched policies data instead of whatever it currently derives from.

5. **Auto-update Step 2 progress**: Since the checklist already counts policies via `withAllowance`, saving a policy here will automatically reflect in the "Set Allowances" progress bar.

### UI Layout (within the drill-down)
```text
┌─────────────────────────────────────────────────────┐
│ 📄 Set Allowance                      [Components]  │
│                                                      │
│  Included:  [15g] [30g] [45g] [60g] [90g]           │
│  Overage:   [$0.50] /g                               │
│                          [Save Allowance]            │
└─────────────────────────────────────────────────────┘
```

After saving, it collapses to a summary line:
```text
│ 📄 30g included · $0.50/g overage        [Edit]     │
```

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

