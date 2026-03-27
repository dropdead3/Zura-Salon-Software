

## Show "Configure Allowance" When Policy Values Are All Zeros

### Problem
When an allowance policy exists but has default zero values (0g included, $0.00/g overage), the UI displays those zeros as if it's a real configuration. This is confusing — it should show the "Configure Allowance" button instead.

### Implementation — 1 File Modified

**`src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`** (~line 859)

Update the condition that determines whether to show the configured allowance summary vs the "Configure Allowance" button. Currently it checks `policy && policy.is_active`. Add a check that the policy has meaningful values:

```ts
// Before
if (policy && policy.is_active) {

// After
const hasConfiguredValues = policy.included_allowance_qty > 0 || policy.overage_rate > 0;
if (policy && policy.is_active && hasConfiguredValues) {
```

When `included_allowance_qty` and `overage_rate` are both zero, the code falls through to the existing "Configure Allowance" button branch — no new UI needed.

### Scope
- 1 file, ~2 lines changed
- No logic changes to billing engine or database

