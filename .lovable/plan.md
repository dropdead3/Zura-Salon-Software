

## Goal
Two fixes to the Tips card (`AggregateSalesCard`):
1. **Reduce card height** — currently rendering as a tall block with lots of vertical whitespace. Tighten padding so the collapsed row hugs the content.
2. **Replace truncation with adaptive label swap** — instead of `truncate` ellipsis on "Average Tip R...", swap label by breakpoint:
   - Wide: `Average Tip Rate`
   - Medium: `Avg. Rate`
   - Narrow: hidden entirely

## Investigation
Need to inspect `src/components/dashboard/AggregateSalesCard.tsx` to confirm:
- Current `CardHeader` / `CardContent` padding tokens
- Where the icon-box height drives the row height (likely `w-10 h-10` icon box + default `p-6` card padding = ~88px tall)
- The current subtitle wrapper to swap the responsive logic

## Change

### 1. Height reduction
- Tighten `CardHeader` / `CardContent` padding (e.g. `py-3 px-4` instead of default `p-6`).
- Optionally shrink the icon box from `w-10 h-10` → `w-9 h-9` to match the visual density of sibling cards now that this card is collapsed-row-only in this state.
- Ensure the row uses `items-center` (no extra `gap-y` from `space-y-1.5` in `CardHeader`).

### 2. Adaptive label
Replace the single `<span>` with two mutually-exclusive spans:
```tsx
<span className="font-sans text-muted-foreground hidden xl:inline whitespace-nowrap">
  Average Tip Rate
</span>
<span className="font-sans text-muted-foreground hidden md:inline xl:hidden whitespace-nowrap">
  Avg. Rate
</span>
```
- Drop `truncate` everywhere — labels are now nowrap and either fit or hide.
- Below `md`: nothing renders (clean header with just `$` icon + `TIPS` + value).

## Out of scope
- Value formatting, expand/collapse animation, info tooltip position (already top-right from prior change)
- Icon-box token redesign across other cards
- Renaming "TIPS"

## Files
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — header padding, icon-box size, replace truncated subtitle with two breakpoint-gated labels.

