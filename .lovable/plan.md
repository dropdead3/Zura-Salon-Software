

## Remove Variance Threshold Setting from Service Tracking UI

### Rationale
The variance threshold slider is dead configuration — the analytics layer handles variance detection with its own logic, making this per-service setting redundant and potentially confusing for operators.

### Changes

**File:** `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

1. **Remove the `liveThresholds` state** (line 78) — `useState<Record<string, number>>({})`

2. **Remove `variance_threshold_pct` from the interface** (line 44) and **from the select query** (line 161)

3. **Remove the entire Variance Threshold block** (lines 848–872) — the label, MetricInfoTooltip, Slider, and percentage display

4. **Remove `Slider` import** if unused elsewhere in the file

### What stays
- The `variance_threshold_pct` column remains in the database (no migration needed — it's harmless and avoids breaking anything)
- The `useUsageVariance` hook continues using its hardcoded 10% tolerance at the analytics layer

### Scope
- 1 file, ~30 lines removed
- No logic or database changes

