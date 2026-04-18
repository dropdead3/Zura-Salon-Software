

## Diagnosis

The Tips card content is short (~60px), but it's rendering ~150px tall because of how it sits in the dashboard grid:

- Outer grid (line 773): `grid xl:grid-cols-3 gap-6` with the left column set to `xl:col-span-2 flex flex-col h-full`.
- Right "sidebar" column (line 1519): `flex flex-col gap-6` — no `h-full`, but CSS Grid stretches it to match the left column's tall height by default (`align-items: stretch`).
- Inside the sidebar, `TopPerformersCard` is `Card className="... h-full flex flex-col"`. The `h-full` propagates the stretched parent height into TopPerformers, and the column's vertical distribution leaves the Tips `Card` getting stretched too (Card has no `align-self`, so it defaults to `stretch` on the cross-axis of the column — but the column's main-axis is vertical, so stretch applies horizontally only; however, the Tips card's natural height is small, and what we're actually seeing is **the column itself being taller than its natural content + the Tips card sitting at its natural height with the icon row vertically centered by the inner CardHeader's `flex flex-col` + space-y not pinning it to top**).

Combining: the Tips card has been getting auto-vertical-centering via its absolute-positioned info icon (which doesn't take layout space), giving the impression of empty top space.

Re-reading the screenshot: the "TIPS" row IS sitting in the lower portion of a tall card border. That confirms the **Card itself is taller than its content**. The cause is that `Card` with `bg-card/80 backdrop-blur-xl border-border/40` plus the column stretching renders the card with extra vertical space.

The fix is to **stop the Tips card from stretching vertically** when collapsed.

## Change

File: `src/components/dashboard/AggregateSalesCard.tsx` (Tips card, ~line 1541)

Add `self-start` to the Tips `Card` className so it never stretches taller than its own content within the flex-col sidebar:

```tsx
<Card className="relative self-start bg-card/80 backdrop-blur-xl border-border/40">
```

That single class pins the card to its natural height. The sidebar column can remain stretched by the grid, but the Tips card will hug its header content (~60px collapsed, taller when expanded).

## Out of scope
- Restructuring the outer grid or removing `h-full` from the left column (would affect Top Staff + Donut layout).
- Changing TopPerformersCard's `h-full` (it intentionally fills sidebar height).
- Re-laying out the header / icon / label.

## Files
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — add `self-start` to the Tips `Card` wrapper.

