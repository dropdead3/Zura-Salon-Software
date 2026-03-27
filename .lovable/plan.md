

## Allow Deselecting Billing Method to Reset

### Problem
Once a billing method is selected, clicking it again does nothing. Users expect toggle behavior — clicking an active pill should deselect it, resetting to the "no method chosen" state.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines 926–938 (billing mode onClick)** — If the clicked mode is already active, set `billing_mode` to `null` (reset) instead of re-upserting the same mode. Also reset `is_active` to `false` and zero out allowance values so the service returns to unconfigured state:

```typescript
onClick={(e) => {
  e.stopPropagation();
  if (active) {
    // Deselect — reset to unconfigured
    upsertPolicy.mutate({
      organization_id: effectiveOrganization!.id,
      service_id: service.id,
      billing_mode: null,
      is_active: false,
      included_allowance_qty: 0,
      overage_rate: 0,
      overage_rate_type: 'per_unit',
      overage_cap: null,
      notes: null,
    });
  } else {
    // Select new mode (existing logic)
    upsertPolicy.mutate({ ... });
  }
}}
```

### Result
Clicking an already-selected billing pill deselects it, returning the service to the "Select a billing method above" state. This gives users a natural undo path without needing to use the destructive Reset action.

