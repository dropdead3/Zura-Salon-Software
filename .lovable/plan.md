# Fix Overlapping Appointment Gap

## Problem

When two appointments share a time block on the same stylist column (double-booking), a visible gap appears between them. Reference: the orange "Single Process Color" card and the tan "Walk-in Signature Haircut" card in the screenshot — there is clear background showing through where the two cards meet at the 50% column line.

The horizontal math in `DayView.tsx` and `WeekView.tsx` is actually correct (col 0 ends at 50%, col 1 starts at 50%), so the cards' bounding boxes do touch. The visible gap comes from **visual treatments inside the card**, not the layout math.

## Root Cause

In `src/components/dashboard/schedule/AppointmentCardContent.tsx` line 626, every grid card uses `rounded-lg` (8px on all four corners). When two cards sit edge-to-edge:

- Col 0 right edge has its top-right and bottom-right corners curved inward
- Col 1 left edge has its top-left and bottom-left corners curved inward
- The two arcs curve away from each other, leaving a diamond-shaped sliver of background visible at the shared boundary

Secondary contributors:
- `ring-offset-1` on the selected state pushes the visible card inward by 1px on every side, widening the gap when one card is selected
- The `border-l-4` colored accent only renders on the left edge, so col 1 gets a 4px solid bar at the meeting line while col 0 has nothing — making the gap feel asymmetric

## Solution

Make adjacent edges of overlapping cards square and visually flush. Outer edges (the ones not touching another card) keep the rounded corners.

### 1. Pass overlap position into `AppointmentCardContent`

`AppointmentCardContent` (and `WeekAppointmentCard`'s inline render) needs to know whether it's a left-edge, middle, or right-edge card in the overlap stack. Add two optional props:

- `isFirstCol?: boolean` (default true)
- `isLastCol?: boolean` (default true)

Both default true so non-overlapping cards (the common case) keep `rounded-lg` on all four corners.

### 2. Square the inner corners

Replace the unconditional `rounded-lg` on the outer card div (line 626) with conditional rounding:

- `isFirstCol && isLastCol` → `rounded-lg` (no overlap, all corners round)
- `isFirstCol && !isLastCol` → `rounded-l-lg` (left-edge card; right edge square)
- `!isFirstCol && isLastCol` → `rounded-r-lg` (right-edge card; left edge square)
- `!isFirstCol && !isLastCol` → no rounding (middle card)

Apply the same conditional to the multi-service color band overlay on line 650 (currently hardcoded `rounded-lg`) so the colored bands match the card silhouette.

### 3. Drop the 1-pixel inset

In `DayView.tsx` (lines 286–293) and `WeekView.tsx` (lines 218–224), the `leftOffset = isFirstCol ? 1 : 0` / `rightPad = isLastCol ? 1 : 0` insets pull the entire overlap stack 1px in from each side of the column. This is fine for the outer column edges but contributes nothing to the inner meeting point. Keep the outer 1px for column breathing room (it prevents the card from kissing the column divider) — no change needed here. The fix is purely in the corner radius.

### 4. Tighten the selected ring

On line 634 of `AppointmentCardContent.tsx`, change `ring-2 ring-primary/60 ring-offset-1` to `ring-2 ring-primary/60 ring-inset` so selecting a card no longer pushes its silhouette inward and re-opens the gap.

### 5. Wire the props through

- `DayView.tsx` line 961: pass `isFirstCol={columnIndex === 0}` and `isLastCol={columnIndex === totalOverlapping - 1}` to `<AppointmentCard>`, then forward them through to `<AppointmentCardContent>` inside the `AppointmentCard` wrapper (line 317).
- `WeekView.tsx`: the WeekAppointmentCard already computes `isFirstCol`/`isLastCol` locally (lines 218–219). Apply the same conditional `rounded-*` directly on its card div.

## Files to Edit

- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — conditional corner radius, `ring-inset`, accept `isFirstCol`/`isLastCol` props
- `src/components/dashboard/schedule/DayView.tsx` — pass `isFirstCol`/`isLastCol` from `getOverlapInfo` through `AppointmentCard` to `AppointmentCardContent`
- `src/components/dashboard/schedule/WeekView.tsx` — apply conditional corner radius on the overlapping card silhouette

## Out of Scope

- Color, shadow, hover, drag, and z-index behavior remain unchanged
- Single (non-overlapping) appointments render identically
- BreakBlockOverlay and AssistantBlockOverlay are not affected (they don't stack horizontally)