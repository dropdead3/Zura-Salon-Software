

## Goal
Keep every appointment card fully rounded (`rounded-lg`) and fully stroked on all four sides — including overlapping/double-booked cards — while eliminating the visible vertical gap between them.

## Why the gap is showing now
The previous fix tried to butt cards flush by **removing** rounded corners and inner-edge borders. That changed the look (shared seams looked like one merged block) and the user does not want that. They want each card to look like its own complete pill: rounded on all 4 corners with a full stroke. With that visual, two side-by-side cards will always show a slot-of-background between them unless the boxes themselves overlap slightly.

## Approach
Restore full rounding + full borders on every card, then close the visible gap by **physically overlapping the card boxes** in the schedule columns by a small fixed amount, with z-stacking so neither card eats the other's stroke.

### 1. Restore full card chrome — `AppointmentCardContent.tsx`
- Remove `roundingClass` branching. Always use `rounded-lg`.
- Remove `suppressLeftEdge` / `suppressRightEdge`. Border widths return to `1px` on all four sides for both the dark-style and light-style branches of `cardStyle`.
- Restore the original `border-l-4` accent (no inset accent strip), since it no longer needs to "stay flush."
- Drop the `isFirstOverlapCol` / `isLastOverlapCol` branches inside the inner multi-service band wrapper — it goes back to `rounded-lg`.
- Keep `isOverlapping`, `isFirstOverlapCol`, `isLastOverlapCol` props on the API (still used for z-index hinting from views).

### 2. Make overlap columns physically kiss — `src/lib/schedule-utils.ts`
Update `getOverlapColumnLayout` so each overlap column extends `OVERLAP_KISS_PX` (≈4px) into its right neighbor:
- All cards: `width: calc(${widthPercent}% + ${kissPx}px)` (last column trimmed back to exact width so the rightmost card doesn't bleed past the stylist column).
- Returned metadata adds `zIndex` so earlier columns render on top, ensuring the leftmost stroke of card N+1 visually tucks under the rounded right edge of card N. Net effect: rounded edges touch and the slot background line disappears.
- 4px is the same px as the corner radius of `rounded-lg`, so the rounded edges meet at their tangent point with no visible white sliver.

### 3. Wire z-index in the views — `DayView.tsx` & `WeekView.tsx`
- Apply the helper's `zIndex` to the absolutely-positioned card wrapper (`style.zIndex = …`).
- Convention: leftmost overlap column = highest z, decreasing rightward. This guarantees the rounded right edge of column N sits over column N+1's left edge.
- Selected / hovered cards bump above all overlap-stack peers (z-30) so the selection ring stays unobscured.

### 4. Selection + special states stay flush
- Keep `ring-inset` on selected / no-show cards (do not bring back `ring-offset`, which would re-open gaps).
- Cancelled (opacity-60) and gradient cards inherit the same overlap kiss automatically — no special-case code.

## Files to change
- `src/lib/schedule-utils.ts` — extend `getOverlapColumnLayout` (kiss + zIndex)
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — restore full radius + full borders + original left accent; drop edge-suppression logic
- `src/components/dashboard/schedule/DayView.tsx` — apply `zIndex` from helper
- `src/components/dashboard/schedule/WeekView.tsx` — apply `zIndex` from helper

## QA
- Two-way overlap: both cards are fully rounded pills, strokes visible all the way around each, no gap between them.
- Three-way overlap: all three render as discrete rounded cards with rounded edges visually touching, no gap.
- Selected overlap card: selection ring fully visible on all four sides.
- Single (non-overlap) card: unchanged — full rounding, hover-shrink right grip still works.
- Day view + Week view behave identically.

## Enhancement suggestion
Better next prompt phrasing: "all overlap cards must keep `rounded-lg` + full border, but visually touch with no slot background between them" — that single sentence pre-empts the corner-stripping path entirely. After this lands, the next worthwhile move is promoting the kiss-inset value into the design tokens (`tokens.schedule.overlapKissPx`) so any future schedule overlay (drag previews, coverage blocks, AI suggestion ghosts) inherits flush behavior automatically.

