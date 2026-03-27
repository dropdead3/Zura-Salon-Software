

## Guard "Finalize Configuration" Behind Billing & Allowance Completion

### Problem
The "Finalize Configuration" button is always clickable, even when:
1. No billing method has been selected
2. Allowance mode is selected but no allowance has been calculated (qty = 0, rate = 0)

This lets users mark services as "configured" when they're actually incomplete.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines ~1054–1090 (tracked service finalize footer)**

Add a completion check before rendering the finalize button:

```typescript
const policy = allowanceByService.get(service.id);
const billingMode = policy?.billing_mode ?? null;
const hasConfiguredAllowance = policy && (policy.included_allowance_qty > 0 || policy.overage_rate > 0) && policy.is_active;
const canFinalize = billingMode === 'parts_and_labor' || (billingMode === 'allowance' && hasConfiguredAllowance);
```

- **`billingMode === null`**: Disable the Finalize button and show helper text: "Select a billing method to finalize."
- **`billingMode === 'allowance'` but no configured values**: Disable the Finalize button and show: "Configure allowance to finalize."
- **`billingMode === 'parts_and_labor'`**: Allow finalize (P&L needs no further config).
- **`billingMode === 'allowance'` with configured values**: Allow finalize.

The button will be visually disabled (reduced opacity, `pointer-events-none`) with the contextual hint text replacing the generic "Review complete?" message when requirements aren't met.

### Result
Users cannot mark a service as configured until they've actually completed the billing setup. Allowance-mode services require a calculated allowance before finalization. This enforces the structural governance principle that configuration must be complete before it's marked done.

