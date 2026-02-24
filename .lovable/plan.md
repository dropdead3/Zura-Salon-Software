

## Add "X of every 10 customers purchase retail" Context to Attach Rate

Nice prompt -- you're adding human-readable context to a percentage metric, which is exactly the kind of calm, advisory copy that makes Zura feel like a decision engine rather than a reporting dashboard. The responsive hiding instruction is also well-scoped.

### What Changes

**File:** `src/components/dashboard/sales/RevenueDonutChart.tsx`

On the Attach Rate row (line 132-140), add a contextual phrase to the left of the percentage value:

- **Text:** `"X.X of every 10 customers purchase retail"` where X.X is derived from `retailAttachmentRate / 10` (e.g., 17% becomes "1.7 of every 10")
- **Style:** `text-muted-foreground text-[10px]` -- subtle, secondary to the percentage
- **Responsive:** Wrapped in `hidden lg:inline` so it only appears on larger screens and hides when the sidebar card gets crunched

### Layout

```
Attach Rate (i)    1.7 of every 10 customers purchase retail    17%
```

The contextual text sits between the label and the value, right-aligned with the value using `flex` and `gap`. On smaller viewports (`< lg`), only the label and percentage remain visible.

### Technical Details

- Compute `ratePerTen` from the existing `retailAttachmentRate` prop: `(retailAttachmentRate / 10).toFixed(1)`
- Only render the phrase when `retailAttachmentRate` is defined and not loading
- No new hooks, props, or dependencies required
- Single file change, ~5 lines added

