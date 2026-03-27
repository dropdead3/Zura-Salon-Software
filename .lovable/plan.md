

## Add Billing Mode Choice to Service Tracking & Services Configurator

### Problem
Chemical services currently default to allowance-based pricing with no way to select **Parts & Labor** mode — where the client pays the stylist's hourly rate plus retail cost of supplies, with no allowance. The `billing_mode` column already exists on `service_allowance_policies` and the billing engine already handles both modes, but the UI never exposes the choice.

### Design

A billing mode selector appears in two places, keeping them in sync via the shared `service_allowance_policies` table:

```text
Billing:  [ Allowance ]  [ Parts & Labor ]

(Allowance):   📄 Configure Allowance  ⓘ  / recipe summary + Edit
(Parts & Labor): 📄 Parts & Labor — client pays hourly rate + retail cost of supplies
```

### Changes

#### 1. ServiceTrackingSection.tsx — Add billing mode toggle (lines ~747–824)

- **Read** `billing_mode` from the existing policy (default `'allowance'` when no policy)
- **Render** a two-option toggle row (dashed-outline pill buttons matching the Bowls/Bottles vessel style) above the current allowance config block:
  - "Allowance" — shows existing Configure Allowance / recipe summary / Edit
  - "Parts & Labor" — shows info line: `FileText` icon + "Parts & Labor — client pays hourly rate + retail cost of supplies. No allowance needed."
- **On toggle**, upsert `service_allowance_policies` via existing `upsertPolicy.mutate()` with the new `billing_mode`
- When switching to Parts & Labor, deactivate the allowance policy (`is_active: false`) so overage logic doesn't fire
- When switching back to Allowance, keep existing recipe if one was configured
- Apply same pattern to the **untracked-but-chemical** service block (~line 950+) if it has an allowance section

#### 2. ServiceEditorDialog.tsx — Add billing mode selector (lines ~248–280, inside chemical service indent block)

- Add a **Billing Mode** section below Container Types within the `isChemicalService` indent block
- Two radio-style options: "Allowance" and "Parts & Labor" with brief descriptions
- Store selection in local state (`billingMode`), persisted on save via the existing `onSubmit` payload (add `billing_mode` to the submitted data)
- On save, if the service has a policy, update its `billing_mode`; if no policy exists yet and mode is `parts_and_labor`, create a minimal policy row
- When `parts_and_labor` is selected, hide the "Cost ($)" field tooltip about margin reporting (it becomes the direct supply cost)

#### 3. Bidirectional sync (gap fix)

- When billing mode is changed in **ServiceTrackingSection**, the policy table updates — ServiceEditorDialog reads from the same policy on open, so it stays in sync automatically
- When billing mode is changed in **ServiceEditorDialog** on save, upsert the `service_allowance_policies` row so ServiceTrackingSection picks it up on next render
- Add `billing_mode` to the `useServiceAllowancePolicies` select query if not already included (it is — confirmed in the hook)

#### 4. AllowanceCalculatorDialog — Guard against opening in P&L mode

- If the service is set to `parts_and_labor`, the "Configure Allowance" button won't render (gated by the toggle), so the dialog naturally won't open. No changes needed here.

### What's already wired (no changes needed)
- `billing_mode` column on `service_allowance_policies` — exists
- `useCalculateOverageCharge` — handles `parts_and_labor` branch
- `useEstimatedProductCharge` — filters for `parts_and_labor` services at checkout
- `CheckoutSummarySheet` — renders product cost charges for P&L services
- `AllowancesBillingSection` — already has a billing mode toggle (platform admin level)

### Scope
- 2 files modified: `ServiceTrackingSection.tsx`, `ServiceEditorDialog.tsx`
- ~40 lines added/restructured per file
- No database changes

