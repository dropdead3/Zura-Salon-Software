

# Fix Label-to-Quantity Spacing

## Problem
The "Edited" and "Auto" labels sit too close to the quantity box — they need consistent right padding/margin to create visual separation.

## Change

### File: `CommandCenterRow.tsx` (line 305)
Add `mr-2` to the fixed-width label slot `<span>` so "Edited" and "Auto" have consistent spacing before the quantity number.

```
// Line 305: change
<span className="min-w-[3.5rem] flex justify-end">
// to
<span className="min-w-[3.5rem] flex justify-end mr-2">
```

| File | Change |
|------|--------|
| `CommandCenterRow.tsx` (line 305) | Add `mr-2` to label slot span |

