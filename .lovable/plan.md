

## Fix: Center highlighted revenue area within the Sales Overview card

The highlighted (drilldown-active) revenue area uses `p-2 -m-2` for its padding/negative-margin trick, but the parent card has `p-4 sm:p-6` padding. This means the highlight ring doesn't extend to the card edges -- it sits as a smaller inset box, making the centered content look off-center relative to the overall card.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 647)**

Update the negative margin on the clickable revenue `div` to match the parent card's padding so the highlight ring spans the full inner width:

- Change `p-2 -m-2` to `p-4 -m-4 sm:p-6 sm:-m-6` (matching the parent's `p-4 sm:p-6`)
- Also add `mt-0` to prevent the negative top margin from collapsing into the location label above -- or alternatively, keep a smaller top offset (`-mt-2`) so the highlight doesn't overlap the "All locations combined" text

Specifically:
```
- "text-center mb-4 sm:mb-6 cursor-pointer transition-all rounded-lg p-2 -m-2 group/revenue"
+ "text-center mb-4 sm:mb-6 cursor-pointer transition-all rounded-lg p-4 -mx-4 sm:p-6 sm:-mx-6 -mb-4 sm:-mb-6 group/revenue"
```

The key insight: use `-mx-4 sm:-mx-6` (horizontal only) to extend the highlight to the card edges, and `-mb-4 sm:-mb-6` to reach the bottom, but keep the top margin at `0` so it doesn't overlap the location label. This keeps the ring flush with the card boundaries horizontally while the content stays centered.

