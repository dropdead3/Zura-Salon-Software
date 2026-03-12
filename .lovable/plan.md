

# Phase 3: Service Allowance Billing — Architecture

## Overview

Allow services to include a product usage allowance (e.g., 180g of color). When a mix session completes, if actual net usage exceeds the allowance, an overage charge is calculated and attached to the appointment for checkout.

```text
billable_overage = max(0, net_usage − included_allowance)
overage_charge   = billable_overage × overage_rate
```

---

## 1. Schema Changes (3 new tables, 1 column addition)

### 1a. `service_allowance_policies`

Defines the allowance and overage rules per service. One policy per service per org.

```sql
CREATE TABLE IF NOT EXISTS public.service_allowance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  included_allowance_qty NUMERIC NOT NULL DEFAULT 0,     -- e.g. 180
  allowance_unit TEXT NOT NULL DEFAULT 'g',               -- g, ml, oz
  overage_rate NUMERIC NOT NULL DEFAULT 0,                -- cost per unit over
  overage_rate_type TEXT NOT NULL DEFAULT 'per_unit',     -- 'per_unit' | 'flat' | 'tiered'
  overage_cap NUMERIC,                                    -- max charge (null = unlimited)
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_id)
);
-- RLS: org_member SELECT, org_admin ALL
-- Trigger: update_backroom_updated_at
-- Index: service_id
```

### 1b. `checkout_usage_charges`

Ledger of overage charges generated from mix sessions, linked to appointments.

```sql
CREATE TABLE IF NOT EXISTS public.checkout_usage_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  mix_session_id UUID NOT NULL REFERENCES public.mix_sessions(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.service_allowance_policies(id) ON DELETE SET NULL,
  service_name TEXT,
  included_allowance_qty NUMERIC NOT NULL,
  actual_usage_qty NUMERIC NOT NULL,
  overage_qty NUMERIC NOT NULL,
  overage_rate NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,                        -- final dollar amount
  status TEXT NOT NULL DEFAULT 'pending',                 -- pending | approved | waived | applied
  waived_by UUID REFERENCES auth.users(id),
  waived_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: org_member SELECT/INSERT, org_admin UPDATE
-- Trigger: update_backroom_updated_at
-- Index: appointment_id, mix_session_id
```

### 1c. `allowance_override_log`

Audit trail for manager overrides (waivers, adjustments).

```sql
CREATE TABLE IF NOT EXISTS public.allowance_override_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES public.checkout_usage_charges(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                                   -- 'waived' | 'adjusted' | 'approved'
  previous_amount NUMERIC,
  new_amount NUMERIC,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: org_member SELECT, org_admin INSERT
-- Index: charge_id
```

---

## 2. Billing Rule Engine

Pure calculation module at `src/lib/backroom/allowance-billing.ts`:

```typescript
interface AllowanceBillingInput {
  includedAllowanceQty: number;
  actualUsageQty: number;
  overageRate: number;
  overageRateType: 'per_unit' | 'flat' | 'tiered';
  overageCap: number | null;
}

interface AllowanceBillingResult {
  overageQty: number;
  chargeAmount: number;
  isOverage: boolean;
  unusedAllowance: number;
}

function calculateOverageCharge(input): AllowanceBillingResult {
  const overageQty = Math.max(0, input.actualUsageQty - input.includedAllowanceQty);
  let charge = 0;
  if (input.overageRateType === 'per_unit') charge = overageQty * input.overageRate;
  else if (input.overageRateType === 'flat') charge = overageQty > 0 ? input.overageRate : 0;
  if (input.overageCap !== null) charge = Math.min(charge, input.overageCap);
  return { overageQty, chargeAmount: roundCost(charge), isOverage: overageQty > 0, unusedAllowance: ... };
}
```

No AI, no approximation — deterministic math only.

---

## 3. Hooks

| Hook | Purpose |
|---|---|
| `useServiceAllowancePolicies(serviceId?)` | CRUD for allowance policies |
| `useCalculateOverageCharge(sessionId)` | On session completion: look up policy, compute overage, insert `checkout_usage_charges` |
| `useCheckoutUsageCharges(appointmentId)` | Fetch pending/approved charges for checkout display |
| `useWaiveOverageCharge()` | Manager waiver mutation + audit log insert |
| `useApproveOverageCharge()` | Manager approval mutation + audit log insert |

---

## 4. Checkout Integration

**Trigger point:** `handleCompleteSession` in `MixSessionManager.tsx` — after formula save and inventory depletion, call `calculateOverageCharge.mutateAsync()`.

**Flow:**
1. Session completes → aggregate `net_usage_weight` from all non-discarded bowls
2. Look up `service_allowance_policies` for the session's service
3. If no policy or policy inactive → no charge, exit
4. Calculate `billable_overage` and `charge_amount`
5. Insert `checkout_usage_charges` with status `pending`
6. Toast: "Overage charge of $X pending approval"

**Checkout surface:** When checkout begins (appointment transitions to `completed`/pay), query `checkout_usage_charges` for the appointment. Display pending charges with approve/waive actions for managers.

---

## 5. Manager Override Workflow

Managers can:
- **Approve** a pending charge → status moves to `approved`, logged in `allowance_override_log`
- **Waive** a charge → status moves to `waived`, reason required, logged in `allowance_override_log`
- **Adjust** the charge amount → updates `charge_amount`, logged with `previous_amount` and `new_amount`

Auto-approve option: `service_allowance_policies` can be extended with `auto_approve_under` threshold — charges below this amount are auto-approved on creation.

---

## 6. Audit Logging

Every state change on `checkout_usage_charges` produces a row in `allowance_override_log`:
- `action`: waived, adjusted, approved
- `performed_by`: the user who took action
- `reason`: required for waivers, optional for approvals

---

## 7. UI Surfaces

| Surface | Location | Content |
|---|---|---|
| **Policy Manager** | `/dashboard/settings/inventory/` | Card per service: allowance qty, unit, overage rate, cap |
| **Session Overage Banner** | `MixSessionManager` (post-completion) | "50g over allowance — $X charge pending" |
| **Checkout Charges Panel** | `AppointmentDetailSheet` (pay flow) | List of pending charges with approve/waive buttons |
| **Override Dialog** | Within charges panel | Reason input + confirm for waive/adjust |

---

## 8. Implementation Order

1. Create 3 tables via migration (`service_allowance_policies`, `checkout_usage_charges`, `allowance_override_log`)
2. Build `allowance-billing.ts` calculation module
3. Build `useServiceAllowancePolicies` hook
4. Build `useCalculateOverageCharge` hook
5. Wire into `handleCompleteSession`
6. Build `useCheckoutUsageCharges` + `useWaiveOverageCharge` + `useApproveOverageCharge`
7. Build Policy Manager UI in settings
8. Build Checkout Charges Panel in `AppointmentDetailSheet`

