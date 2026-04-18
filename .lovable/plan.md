

## Goal
Vertically center the dollar amount on the right side of each Top Performer row so it aligns with the row's vertical center (matches the visual center of the avatar/rank badge), instead of baseline-aligning with the name text.

## What's wrong
In the current wide layout (`@[340px]:flex-row`), the name+amount row uses `items-baseline`. The name has a 14px subtitle (`14.9% of total service`) below it inside the inner content block, so the row's true vertical center sits between name and subtitle — but the dollar amount baseline-aligns to the name only, making it visually float toward the top of the card.

The user wants the dollar amount centered against the **outer row** (the rank badge + content block as a whole), so it sits at the row's vertical midpoint.

## Fix
Restructure the wide-layout so the dollar amount is a **sibling of the entire content block**, not nested inside the name row. That way it can `items-center` against the full row height (avatar + name + subtitle).
<lov-tool-use id="toolu_vrtx_01StfsJ71BPYb1uyJj9ugQEE" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/sales/TopPerformersCard.tsx\", \"lines\": \"150-230\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TFxPJgXZfqqGw7qbQtG7PD" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/dashboard/sales/TopPerformersCard.tsx\", \"lines\": \"150-230\"}">
</lov-tool-use>
I have what I need. The user wants the right-side dollar amount to align with the top and bottom edges of each row card (vertically centered between them) — instead of sitting on the baseline of the name text near the top.

<lov-plan>

## Goal
In the wide layout (≥340px), vertically **center** the dollar amount against the full row height — so it visually anchors between the top and bottom edges of each card — instead of baseline-aligning to the name text at the top.

## What's wrong
Line 186: outer flex uses `items-start` and the amount inherits baseline alignment from `@[340px]:items-baseline` on the inner row. Result: `$583` sits up high next to "Alexis Heasley" instead of centered against the two-line block (name + share %).

## Fix
Restructure the right column so the amount becomes a sibling of the entire text block (name + share line), not nested inside the name's row. That lets it center against the full content height.

**`src/components/dashboard/sales/TopPerformersCard.tsx`** lines 186–219:

```tsx
<div className="flex items-start @[340px]:items-center gap-3">
  {/* Rank badge */}
  <span className={cn(
    "w-7 h-7 rounded-full flex items-center justify-center font-display text-xs shrink-0 mt-0.5 @[340px]:mt-0",
    styles.badge
  )}>{rank}</span>

  {/* Avatar */}
  <Avatar className="h-9 w-9 shrink-0 hidden @[400px]:flex mt-0.5 @[400px]:mt-0">
    <AvatarImage src={performer.photo_url} alt={performer.name} />
    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
  </Avatar>

  {/* Text block: name + share */}
  <div className="flex-1 min-w-0 flex flex-col @[340px]:flex-row @[340px]:items-center @[340px]:justify-between @[340px]:gap-3">
    <div className="min-w-0">
      <p className="text-sm font-medium truncate">{performer.name}</p>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        <span className="font-medium text-foreground/70">{revenueSharePct.toFixed(1)}%</span>
        <span className="hidden @[320px]:inline"> of total {sortMode === 'retail' ? 'retail' : 'service'}</span>
      </div>
    </div>
    <BlurredAmount
      className={cn(
        "font-display text-sm mt-1 @[340px]:mt-0 shrink-0 whitespace-nowrap",
        rank === 1 && "text-foreground"
      )}
    >
      {formatCurrency(Math.round(displayValue), { maximumFractionDigits: 0 })}
    </BlurredAmount>
  </div>
</div>
```

Key changes:
- Outer flex: `items-start @[340px]:items-center` — vertically centers rank/avatar against the row at wide widths
- Inner content row: `@[340px]:items-center` (was `items-baseline`) — centers the amount against the full name+share block
- Name and share % grouped in a single `<div>` so the amount centers against their combined height, not just the name baseline
- Narrow (<340px) layout: still stacks (name → share → amount), unchanged behavior

## Verification
- Wide card (current viewport): `$583` visually centered between the top and bottom edges of the row, aligned with the midpoint of the rank badge
- Narrow card (<340px): stacked layout intact, no overlap
- Long names still truncate; amount stays anchored right
- BlurredAmount privacy toggle still works
- Rank 1 emphasis preserved

## Out of scope
- Row padding/spacing changes
- Other ranking cards (none in Sales hub use this layout)
- Avatar breakpoint adjustments

## Files
- **Modify**: `src/components/dashboard/sales/TopPerformersCard.tsx` (one block, lines 186–219)

