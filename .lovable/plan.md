

## Consolidate "Classify" and "Enable Tracking" into One Step

### Problem
When a user marks a service as "Requires Color/Chemical", it automatically sets `is_backroom_tracked = true`. These are not independent steps — they happen in a single toggle. Showing them as two separate progress milestones is confusing and redundant.

### Solution
Merge the two milestones into a single **"Classify & Track Services"** step, reducing the progress checklist from 3 steps to 2:

```text
  ✓ Classify & Track Services           66 of 74
    Review each service and mark whether it requires color or chemical products.

  2 Set Allowances                        0 of 48
    Define supply allowances and overage billing rules for tracked services.
```

### Technical Detail

**File: `ServiceTrackingSection.tsx`** (milestones array, ~line 240)

Replace the 3-item milestones array with 2 items:
1. **"Classify & Track Services"** — uses the existing `classified` count (services where `is_chemical_service !== null`) out of `allServices.length`
2. **"Set Allowances"** — unchanged (`withAllowance.length` / `tracked.length`)

**File: `ServiceTrackingProgressBar.tsx`** — No changes needed; it renders whatever milestones it receives.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (milestones array only)

