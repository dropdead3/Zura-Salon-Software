

## Fix: Center the revenue highlight area properly

**Root cause**: The clickable revenue `div` uses negative margins to stretch to the card edges, but only horizontally and at the bottom -- not the top. The "All locations combined" label sits above the highlight, making the ring visually lopsided. The content looks shifted down within the overall card.

**Solution**: Revert the negative margin approach. Use a contained highlight with modest padding (`p-4 rounded-xl`) that sits naturally within the card. This keeps the ring symmetric around the content and visually centered.

### Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 647)**

Revert the class back to a symmetric, self-contained highlight:

```
// Before (current)
"text-center mb-4 sm:mb-6 cursor-pointer transition-all rounded-lg p-4 -mx-4 sm:p-6 sm:-mx-6 -mb-4 sm:-mb-6 group/revenue"

// After
"text-center mb-4 sm:mb-6 cursor-pointer transition-all rounded-xl p-4 sm:p-6 group/revenue"
```

This gives the highlight its own contained box with equal padding on all sides -- no negative margins, no asymmetry. The ring sits centered between the location label above and the Services/Retail sub-cards below.

