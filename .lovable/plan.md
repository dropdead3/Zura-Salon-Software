

## Fix Billing Method Defaulting to Allowance

### Problem
On line 886 of `ServiceTrackingSection.tsx`, when a service has no policy record yet, the code falls back to `'allowance'`:

```typescript
const billingMode = policy?.billing_mode || 'allowance';
```

This makes every unconfigured service appear as if "Allowance" has already been selected, which is misleading. Neither option should appear selected until the user explicitly chooses one.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Line 886** — Change the fallback from `'allowance'` to `null`:
   ```typescript
   const billingMode = policy?.billing_mode ?? null;
   ```

2. **Lines 892-922** — Update the toggle rendering so that when `billingMode` is `null`, neither pill shows as active. Both pills render in the dashed/unselected style with a `+` icon. Clicking either one creates the policy with that mode (existing mutation logic unchanged).

3. **Line 893** — Update the active check:
   ```typescript
   const active = billingMode !== null && billingMode === mode;
   ```

4. **Lines 926-930** — Guard the mode-specific content below the toggles so it only renders when a mode is actually selected (`billingMode !== null`). When null, show a subtle hint: "Select a billing method above."

### Result
Unconfigured services show both billing options as unselected. The user must explicitly choose Allowance or Parts & Labor, eliminating false "already configured" signals and fixing the progress milestone counts.

