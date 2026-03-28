

## Improve "Take Action" Button Styling — Red Fill + Bright Outline

### Problem
Current ghost styling is too subtle — just red text on transparent background. Needs more visual weight with a red fill and bright red border.

### Solution
Update the className on all three "Take Action" buttons to use a red-filled, outlined style:

```
bg-destructive/15 border border-destructive/60 text-destructive hover:bg-destructive/25
```

This gives a tinted red background, visible red border, and red text — without being as heavy as a solid destructive button.

### Files modified (3 locations, same class change)

1. **`src/components/dashboard/NewBookingsCard.tsx`** line 118
2. **`src/components/dashboard/analytics/BookingPipelineContent.tsx`** line 321
3. **`src/components/dashboard/analytics/ExecutiveSummaryCard.tsx`** line 120

All change from:
```
text-destructive hover:bg-destructive/10 hover:text-destructive
```
To:
```
bg-destructive/15 border border-destructive/60 text-destructive hover:bg-destructive/25 hover:text-destructive
```

