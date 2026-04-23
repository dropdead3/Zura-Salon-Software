
Goal: remove the visible gutter between overlapping appointment cards so double-booked appointments fully share the same time block and touch edge-to-edge.

Why the gap is happening now
- In both `DayView.tsx` and `WeekView.tsx`, overlap layout intentionally subtracts pixels from card width:
  - `left: calc(${leftPercent}% + ${leftOffset}px)`
  - `width: calc(${widthPercent}% - ${leftOffset + rightPad}px)`
- That creates a real horizontal gutter whenever appointments are split into columns.
- `AppointmentCardContent.tsx` also applies `rounded-lg` on every card and `ring-offset-1` on selected cards, which makes shared inner edges look even farther apart.

Implementation
1. Remove overlap gutters from the layout math
- Update the overlap positioning in:
  - `src/components/dashboard/schedule/DayView.tsx`
  - `src/components/dashboard/schedule/WeekView.tsx`
- For `totalOverlapping > 1`, compute each card as exact equal-width columns with no pixel subtraction and no side offsets.
- Keep the existing single-card hover shrink behavior only when `totalOverlapping === 1`.

2. Make overlap cards only round the outer edges
- Extend `AppointmentCardContentProps` in `src/components/dashboard/schedule/AppointmentCardContent.tsx` with overlap-edge metadata:
  - `isFirstOverlapCol?: boolean`
  - `isLastOverlapCol?: boolean`
  - optionally `isOverlapping?: boolean`
- Use those props to swap `rounded-lg` for edge-aware rounding:
  - single card: `rounded-lg`
  - left card in overlap: outer-left rounded only
  - right card in overlap: outer-right rounded only
  - middle card: square shared edges
- Apply the same rounding logic to any internal overlay layers, especially the multi-service band wrapper, so it does not reintroduce curved inner seams.

3. Keep selection states flush
- Replace `ring-offset-1` with `ring-inset` (or an equivalent inset selection style) in `AppointmentCardContent.tsx` so selected overlapping cards do not visually shrink and reopen the gap.

4. Wire the new props through both schedule views
- Pass `isFirstOverlapCol` / `isLastOverlapCol` from:
  - `DayView.tsx`
  - `WeekView.tsx`
- Derive them from the already-available `columnIndex` and `totalOverlapping`.

Files to update
- `src/components/dashboard/schedule/DayView.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`
- `src/components/dashboard/schedule/AppointmentCardContent.tsx`

QA checks
- Verify 2-way and 3-way overlaps render as perfectly flush equal-width columns.
- Verify selected overlapping cards stay flush with no extra gap.
- Verify single appointments still retain normal rounded corners and hover behavior.
- Verify multi-service cards and gradient cards do not show inner curved seams.
