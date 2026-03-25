

## Fix: Double Comma in STEPS Array

### Root Cause
Line 42 in `ServiceTrackingQuickSetup.tsx` has a trailing double comma:
```tsx
{ key: 'classify', label: 'Classify Services', ... },,
```
This inserts an `undefined` element at index 1 in the `STEPS` array. So `STEPS` has 5 entries (classify, undefined, track, components, allowances). When clicking "Next Step", `currentStep` becomes 1, `step` is `undefined`, and accessing `step.key` crashes.

### Fix
Remove the extra comma on line 42.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (line 42 — remove duplicate comma)

