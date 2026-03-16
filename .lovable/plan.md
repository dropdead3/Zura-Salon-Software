

# Auto-Calculate Scale Count from Appointment Volume

## Approach

Use the existing `estimate.monthlyColorServices` data to derive a recommended scale count:

```
dailyColorServices = (monthlyColorServices * locationFraction) / 30
recommendedScales = Math.ceil(dailyColorServices / 10)  // 1 scale per 10 daily color appointments
```

## Changes (`BackroomPaywall.tsx`)

1. **Replace static `scaleCount` state** with a computed value derived from the estimate data, while still allowing manual override via +/- buttons.

2. **Add a `useEffect`** that recalculates the recommended scale count whenever `estimate` or `locationFraction` changes, and updates `scaleCount` accordingly — but only if the user hasn't manually overridden it.

3. **Add a `manualScaleOverride` ref/state** (boolean) that flips to `true` when the user clicks +/- buttons. When `true`, the auto-calculation stops updating the count. This preserves user agency.

4. **Show a helper label** below the scale selector: e.g., "Recommended: 3 scales (based on ~30 daily color services)" so users understand the logic.

### Concrete logic:

```typescript
const [scaleCount, setScaleCount] = useState(0);
const [manualScaleOverride, setManualScaleOverride] = useState(false);

// Auto-calculate recommended scales
const dailyColorServices = estimate 
  ? Math.round((estimate.monthlyColorServices * locationFraction) / 30) 
  : 0;
const recommendedScales = Math.max(1, Math.ceil(dailyColorServices / 10));

useEffect(() => {
  if (!manualScaleOverride && estimate) {
    setScaleCount(recommendedScales);
  }
}, [recommendedScales, manualScaleOverride, estimate]);

// +/- handlers set manualScaleOverride = true
```

5. **Update the +/- button handlers** to call `setManualScaleOverride(true)` alongside `setScaleCount`.

6. **Add a "Reset to recommended" link** that clears the override and snaps back to auto-calculated value.

**File**: `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

