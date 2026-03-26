

## Reset Allowance Row to Initial State After Clearing

### Problem
When "Clear Allowance" zeroes out and deactivates the policy (`is_active: false`, `included_allowance_qty: 0`), the service row still shows "0g included · $0.00/g overage" with an "Edit" button because the condition only checks `if (policy)` — it doesn't check whether the policy is actually active/meaningful.

### Fix

**File:** `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

**Line ~753** — Change the condition from:
```tsx
if (policy) {
```
to:
```tsx
if (policy && policy.is_active) {
```

This single change means a cleared/deactivated policy will fall through to the `else` branch and render the "Configure Allowance" button (initial state) instead of the zeroed-out "Edit" view.

**Alternative considered:** Also checking `included_allowance_qty > 0`, but `is_active` is the canonical flag already set by the clear handler and is the cleaner semantic check.

### Scope
- 1 file, 1 line changed

