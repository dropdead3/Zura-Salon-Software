

## Goal
Convert the vertical left accent spine into a horizontal **top cap** that runs across the top edge of every appointment card.

## What changes
File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

### 1. Category-color cards — swap spine for top cap
Replace the current absolutely-positioned vertical strip (`left-0 top-1 bottom-1 w-[3px]`) with a horizontal cap pinned to the top edge:

```
absolute left-1 right-1 top-0 h-[3px] rounded-b-sm pointer-events-none z-[3]
```

- Sits flush against the top edge (`top-0`)
- Inset `1px` from left/right so it respects the card's `rounded-[10px]` corners
- `rounded-b-sm` softens the bottom of the cap so it visually melts into the card body
- Still uses `catColor.text` at `0.7` opacity — same color identity, new orientation
- Conditions stay identical (`useCategoryColor && !displayGradient && !BLOCKED_CATEGORIES…`)

### 2. Status-color cards — swap `border-l-4` for `border-t-4`
In the main grid container className (line 685):
- Replace `'border-l-4'` with `'border-t-4'`
- Same conditional (`!useCategoryColor && !displayGradient`)
- Uses the existing `statusColors.border` color, just on the top edge instead of left

### 3. Inner highlight ring — preserve the lit edge
Keep the inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.18)`). It sits *under* the new cap visually and reads as a subtle gloss line right below the colored cap — adds depth without conflict.

## What stays exactly the same
- Card radius, shadow, hover lift, sheen overlay, selected glow
- 1px overlap gap math in `schedule-utils.ts`
- All status pills, NC/RC chips, stylist avatars
- Cancelled hatch + no-show dot + selected ring
- Multi-service inner band wrapper
- Day / Week / Agenda variant structure

## QA
- Every card shows a thin colored cap across its top edge instead of a stripe down its left side
- Cap respects the rounded top corners (no color bleeding past the radius)
- Both category-colored cards (pastel) and status-colored cards (Conf/Unconf/etc.) get the same cap treatment
- Overlap pairs: caps sit cleanly on each card; the 1px gap between cards is preserved
- Selected / no-show / cancelled cards still render correctly

## Enhancement suggestion
After this lands, consider promoting the top cap into a reusable `<CardAccentCap />` primitive (with `color` + `position` props). That way the same accent language can extend to drag previews, coverage blocks, and break overlays — keeping the schedule's visual grammar consistent across every overlay surface.

