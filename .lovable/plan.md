

## Goal
Improve the Top Performers card row layout to:
1. Round dollar amounts to the nearest whole dollar (no pennies)
2. Use the available width: when the card is wide, place the dollar amount **to the right of the name** on the same line; when narrow, **stack** (current behavior) — with smooth container-query breakpoints, no overlap

## What's wrong today (`src/components/dashboard/sales/TopPerformersCard.tsx`)

- Lines 204-206: uses `formatCurrencyWhole(displayValue)` — but that helper is misnamed; it actually formats with **2 decimal places** (`$583.00`). Need to round to nearest dollar.
- Lines 186-211: row is always a vertical stack (name on top, $ below, share% below). On wide cards (≥520px container width as in the screenshot), the right side is empty whitespace.

## Fix

### 1. Round to nearest dollar
Replace `formatCurrencyWhole(displayValue)` with `formatCurrency(Math.round(displayValue), { maximumFractionDigits: 0 })`. Pull `formatCurrency` from the hook (already exported).

### 2. Responsive row layout (container-query driven, since card already has `@container`)

Restructure the content zone so name + $ amount sit on one row when there's space, stack when not:

```
[rank] [avatar?]  Name ─────────────── $583
                  14.9% of total service
```

- Default (narrow, < ~340px container): keep current stacked layout — name above, $ below
- `@[340px]` and up: name and $ on the same flex row with `justify-between`, $ right-aligned and `shrink-0`
- Avatar visibility breakpoint stays at `@[400px]`
- Share line (`14.9% of total service`) stays on its own row beneath

This uses Tailwind container queries (`@container` already on the Card at line 155), so layout responds to the **card's** width, not the viewport — correct for a card that lives in flexible grid columns.

### 3. Anti-overlap guarantees
- `min-w-0` on the name container so truncation (`truncate`) actually triggers instead of pushing the dollar amount
- `shrink-0` + `whitespace-nowrap` on the dollar element
- `gap-3` between name and $ to guarantee breathing room
- Below the breakpoint, fall back to stacked (no overlap risk)

## Code change (single file)

**`src/components/dashboard/sales/TopPerformersCard.tsx`** lines 200-211 (the content zone):

```tsx
{/* Content zone */}
<div className="flex-1 min-w-0">
  <div className="flex items-baseline gap-3 @[340px]:justify-between">
    <p className="text-sm font-medium truncate min-w-0">{performer.name}</p>
    <BlurredAmount
      className={cn(
        "font-display text-sm shrink-0 whitespace-nowrap mt-0.5 @[340px]:mt-0",
        rank === 1 && "text-foreground"
      )}
    >
      {formatCurrency(Math.round(displayValue), { maximumFractionDigits: 0 })}
    </BlurredAmount>
  </div>
  <div className="text-[10px] text-muted-foreground mt-0.5">
    <span className="font-medium text-foreground/70">{revenueSharePct.toFixed(1)}%</span>
    <span className="hidden @[320px]:inline"> of total {sortMode === 'retail' ? 'retail' : 'service'}</span>
  </div>
</div>
```

Plus: change line 68 destructure from `formatCurrencyWhole` to `formatCurrency`.

## Verification
- Wide card (Command Center sidebar at ~520px wide, per screenshot): "Alexis Heasley" and "$583" on one line, share% below
- Narrow card (e.g. mobile or tight grid column < 340px): stacks like before, no overlap
- All amounts show whole dollars (`$583`, not `$583.00`)
- Long names truncate with ellipsis, $ stays anchored right and never overlaps
- BlurredAmount privacy still works (toggle hides numbers)
- Rank 1 still gets emphasized foreground color
- Animations (motion.div) and ranking visuals unchanged

## Out of scope
- Renaming the misnamed `formatCurrencyWhole` helper (it's used in many places; separate audit pass)
- Adjusting the avatar breakpoint (already responsive at `@[400px]`)
- Other cards using the same misnamed helper (separate sweep)

## Files
- **Modify**: `src/components/dashboard/sales/TopPerformersCard.tsx` (one hook destructure + content zone JSX)

