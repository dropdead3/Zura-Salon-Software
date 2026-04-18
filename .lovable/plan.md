

## Diagnosis

The previous `self-start` fix broke the card. In a `flex flex-col` parent, items default to `align-items: stretch` on the **cross axis** (horizontal). `self-start` overrode that, so the Tips card collapsed to its content's intrinsic minimum width (~140px) instead of filling the ~440px sidebar column.

That's why the screenshot shows: tooltip "i" pinned far left of a tiny card, `$` icon + `15.1%` + `TIPS` overlapping in the center, and chevron clipped off. The container queries (`@[420px]`, `@[520px]`) also evaluated to false at 140px width, so neither label rendered.

`self-start` was the wrong tool entirely. Flex-col items don't vertically stretch by default — they take their content's natural height. The earlier "tall card" perception was actually the **sidebar column** being tall (because the left column has lots of content), with the Tips card sitting at its natural ~60px height at the top of that column, leaving empty space below it. That empty space below the Tips card is just the sidebar column extending down, not the card itself.

## Fix

Remove `self-start` from the Tips Card className. The card will fill the column width (~440px), container queries will then have real width to evaluate against, and "Avg. Rate" / "Average Tip Rate" will swap correctly. The card will still be its natural ~60px tall when collapsed — flex-col never stretched it vertically.

If empty space below the card in the sidebar column is unwanted, that's a separate issue (would require restructuring how the right column distributes height vs. the left column).

## Change

`src/components/dashboard/AggregateSalesCard.tsx` line 1541:

```tsx
// Before
<Card className="@container relative self-start bg-card/80 backdrop-blur-xl border-border/40">

// After
<Card className="@container relative bg-card/80 backdrop-blur-xl border-border/40">
```

That's the entire change. Container queries, tooltip side, header padding, and label classes from prior steps all stay.

## Out of scope
- Sidebar column height distribution (Top Performers + Donut + Tips vs. left-column tall content)
- Other cards' widths or alignment
- Restructuring the dashboard grid

## Files
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — remove `self-start` from Tips `Card` className.

