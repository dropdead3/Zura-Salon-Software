

## Diagnosis

The tooltip content is rendering far to the left of the info icon because the `MetricInfoTooltip` is positioned `absolute top-3 right-3` on the Tips card, but the tooltip's default `side="top"` with center alignment causes it to anchor center-to-center on the trigger. Combined with the trigger being a tiny `w-3 h-3` icon at the far right edge of the card, Radix's collision detection is shifting the popover leftward to keep it inside the viewport/container.

Looking at the screenshot: the tooltip content is appearing near the top-left of the card area, while the cursor is on the icon at the top-right. This is classic Radix collision-avoidance kicking in because:

1. The tooltip is wide (`max-w-[280px]`) relative to available space above the icon.
2. With `side="top"` (default), Radix tries to center the 280px popover above a 12px icon sitting near the right edge — it can't, so it slides left.
3. There may also be a `Portal` + transform-origin issue making it look detached.

## Fix

In `src/components/dashboard/AggregateSalesCard.tsx`, pass `side="left"` (or `side="bottom"` with an `align="end"`) to the `MetricInfoTooltip` for the Tips card so the tooltip anchors adjacent to the icon instead of trying to center above it.

Best option: `side="left"` — the tooltip will appear directly to the left of the info icon, immediately adjacent to where the cursor is hovering. This matches the visual mental model of "tooltip belongs to this icon."

### Alternative considered
`side="bottom" align="end"` would drop the tooltip directly below the icon, right-aligned. Also valid but feels less connected to a top-right corner icon.

## Change

File: `src/components/dashboard/AggregateSalesCard.tsx`

Locate the `MetricInfoTooltip` placed in the top-right of the Tips card and add `side="left"`:

```tsx
<MetricInfoTooltip
  description="..."
  side="left"
  className="absolute top-3 right-3 z-10"
/>
```

`MetricInfoTooltip` already accepts a `side` prop (verified in `src/components/ui/MetricInfoTooltip.tsx`), so no component changes are needed.

## Out of scope
- Changing the `MetricInfoTooltip` component default
- Adjusting tooltip width, content, or other cards' tooltip placements
- Restyling the icon position itself

## Files
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — add `side="left"` to the Tips card's top-right `MetricInfoTooltip`.

