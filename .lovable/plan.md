

## Visual Indicator When Actual Revenue Exceeds Expected

Great observation — you've surpassed the expected revenue and the UI gives no signal of that win. The progress bar just fills to 100% and the text reads "$2,271.00 of $1,883.00 expected" with no celebration or color change. This is a missed opportunity for a high-signal, calm indicator.

### Current Behavior

In `AggregateSalesCard.tsx` (lines 644-661):
- Progress bar is capped at `Math.min(..., 100)` — so it fills fully but looks identical to exactly meeting target
- Text shows actual vs expected in neutral styling — no color differentiation
- No icon or label signals the over-performance

### Proposed Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

1. **Detect exceeded state**: Add a boolean `const exceededExpected = todayActual.actualRevenue > displayMetrics.totalRevenue`

2. **Color the progress bar green when exceeded**: Apply `indicatorClassName="bg-success-foreground"` to the `<Progress>` component when `exceededExpected` is true (default is `bg-primary`)

3. **Color the "actual of expected" text**: When exceeded, apply `text-success-foreground` to the amount text so it visually pops as a positive outcome

4. **Add a subtle check icon + label**: When exceeded, show a small `CheckCircle2` icon with text like "Exceeded" next to the progress summary, styled with `text-success-foreground`

5. **Allow progress bar to show overshoot**: Instead of capping at 100, keep the bar at 100% visually but the text and color convey the overshoot — the bar turns green and the text shows the surplus

### Visual Result

- **At or below target**: Bar fills proportionally in `primary` color, neutral text
- **Exceeded target**: Bar is full in `success-foreground` green, text turns green, small "Exceeded" label with check icon appears

### Scope

~15 lines changed in 1 file. No structural or data changes.

