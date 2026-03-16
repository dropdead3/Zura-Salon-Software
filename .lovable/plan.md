

# Per-Location Scale Recommendations + iPad Requirement Notice

## Overview
Replace the single org-wide scale count with a per-location breakdown showing recommended scales for each selected location, plus a grand total. Add a clear notice that an iPad with Bluetooth and a tablet stand are required but not included.

## Data Layer

**New hook: `src/hooks/backroom/usePerLocationColorServices.ts`**

Query `phorest_appointments` grouped by `location_id` for the last 90 days (same window as the pricing estimate), filtered to color/chemical services. Returns a `Map<location_id, dailyColorCount>` so each location gets its own recommendation.

```typescript
// Returns { locationId → avgDailyColorServices }
// Uses isColorOrChemicalService() filter, same as useBackroomPricingEstimate
```

## UI Changes (`BackroomPaywall.tsx`)

### 1. Replace single scale selector with per-location breakdown

Instead of one +/- control, show a table/list within the scale card:

```
┌─────────────────────────────────────────────────┐
│ ⚖ Precision Scales                              │
│ $199 one-time + $10/mo per scale                │
│                                                  │
│  Downtown Salon    ~8/day  →  1 scale            │
│  Westside Studio  ~22/day  →  3 scales           │
│                                                  │
│  Total: 4 scales                                 │
│  ───────────────────────────────────────         │
│  Hardware: $796 one-time                         │
│  License:  $40/mo                                │
│                                                  │
│  ⚠ Requires iPad with Bluetooth + tablet stand  │
│    (not included)                                │
└─────────────────────────────────────────────────┘
```

- Each selected location shows its daily color service count and recommended scale count (1 per 10 daily services, min 1).
- Grand total sums all per-location recommendations.
- Keep a single +/- override for the **total** scale count so users can still adjust, with "Reset to recommended" to snap back.

### 2. iPad requirement notice

Add a subtle info banner at the bottom of the scale card:

```tsx
<div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
  <p className="text-xs text-muted-foreground font-sans">
    Each scale station requires an <span className="text-foreground font-medium">iPad with Bluetooth</span> and a <span className="text-foreground font-medium">tablet stand</span> (not included).
  </p>
</div>
```

### 3. State changes

- `scaleCount` state still controls the total passed to checkout.
- `recommendedScales` becomes the sum of per-location recommendations from the new hook.
- The `useEffect` auto-sync and `manualScaleOverride` logic remain the same, just sourcing from the new per-location total.

## Files

| File | Action |
|------|--------|
| `src/hooks/backroom/usePerLocationColorServices.ts` | **Create** — query daily color services per location |
| `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` | **Modify** — replace single scale selector with per-location breakdown, add iPad notice |

