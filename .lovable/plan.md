

# Fix Calculator Not Responding to Location Toggles

## Root Cause

The savings calculations (`wasteSavings`, `supplyRecovery`, `monthlyAuditCost`) are **static** — they use the raw estimate values regardless of how many locations are selected. Only the **cost** side (`baseCost`) scales with `locationCount`.

This means toggling locations changes the cost but not the savings, so the ROI/net benefit numbers barely move and feel broken.

Similarly, the `usageFee` doesn't scale by location count either — it uses the global `estimate.monthlyColorServices` regardless.

## Fix — Scale savings and usage by location proportion

In `BackroomPaywall.tsx` (lines 87–112), introduce a `locationFraction` multiplier:

```typescript
const totalLocations = activeLocations.length || 1;
const locationFraction = locationCount / totalLocations;

// Cost calculations — already correct for baseCost, but usageFee needs scaling
const baseCost = locationCount * BACKROOM_BASE_PRICE;
const scaleCost = scaleCount * SCALE_LICENSE_MONTHLY;
const usageFee = estimate
  ? Math.round(estimate.monthlyColorServices * locationFraction * BACKROOM_PER_SERVICE_FEE)
  : 0;
const monthlyTotal = baseCost + scaleCost + usageFee;

// Savings — scale by selected locations
const wasteSavings = Math.round((estimate?.estimatedWasteSavings ?? 0) * locationFraction);
const supplyRecovery = Math.round((estimate?.estimatedSupplyRecovery ?? 0) * locationFraction);
const monthlyAuditCost = Math.round(monthlyAuditHours * staffHourlyCost * locationFraction);
```

When 0 locations are selected, `locationFraction = 0`, so all savings and usage fees go to $0 — matching the $0 cost. When all locations are selected, it's 1× (full values). This makes the calculator feel truly interactive and responsive to every toggle.

**File**: `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (lines 87–102)

