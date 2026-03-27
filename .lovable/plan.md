

## Fix: "Configured" Status Shows When Allowance Is Not Actually Set

### Root Cause
The `backroom_config_dismissed` flag was set to `true` (either from a previous interaction or before the allowance guard was tightened), but the allowance policy has zero values (`included_allowance_qty: 0`, `overage_rate: 0`). The footer and badge blindly trust `backroom_config_dismissed` without cross-checking if the billing configuration is actually complete.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**1. Add a derived "truly configured" check that combines `backroom_config_dismissed` with actual billing completeness**

Create a helper that returns `true` only when:
- `backroom_config_dismissed === true` AND one of:
  - No billing policy exists (service was intentionally dismissed as non-chemical)
  - `billing_mode === 'parts_and_labor'` (always complete)
  - `billing_mode === 'allowance'` AND `is_active === true` AND (`included_allowance_qty > 0` OR `overage_rate > 0`)

If `backroom_config_dismissed` is `true` but the allowance policy has zero values, treat the service as **not configured**.

**2. Replace raw `service.backroom_config_dismissed` checks with the derived check**

Update the following locations:
- **Table row badge** (line ~829): The green "Configured ✓" badge
- **Table row background** (line ~736): The emerald tint
- **Category group counter** (line ~437): The `isFullyConfigured` logic (already partially correct but uses `||` with `backroom_config_dismissed` which bypasses the allowance check)
- **Footer section** (line ~1095): The "Configured" vs "Finalize" footer
- **Needs attention filter** (line ~343): Early return that skips attention check

**3. Auto-reset `backroom_config_dismissed` when it's stale**

When a tracked service has `backroom_config_dismissed: true` but billing mode is `allowance` with zero values, automatically reset the flag to `false` in the background. This cleans up stale data without user intervention.

### Result
- A service with Allowance selected but no allowance amount configured will show "Unconfigured" / "Allowance Needs To Be Set" instead of "Configured ✓"
- The "Finalize Configuration" button remains disabled until the allowance is actually set
- Stale `backroom_config_dismissed` flags get auto-corrected

