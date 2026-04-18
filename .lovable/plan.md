

## Goal
Change the `RetailPerformanceAlert` interaction model from click-to-toggle to **click-to-expand, mouse-leave-to-collapse**. Expanded state persists as long as the cursor stays within the card; leaving collapses it.

## Behavior
- **Default**: collapsed (headline only)
- **Click**: expand to reveal advisory copy
- **Mouse leave** (after expanded): collapse back
- **Hover alone** (without click): no change — stays collapsed
- **Keyboard** (Enter/Space): expand; collapses on `blur` for parity with mouse-leave

## Implementation
Single file: `src/components/dashboard/sales/RetailPerformanceAlert.tsx`

1. Replace `toggle` with explicit `expand` (sets `true`) and `collapse` (sets `false`).
2. Wire handlers on the row:
   - `onClick={expand}` (was `toggle`)
   - `onMouseLeave={collapse}` (new)
   - `onBlur={collapse}` (keyboard parity)
   - `onKeyDown`: Enter/Space calls `expand` (was `toggle`)
3. Chevron rotation, animation, padding shift, and red-ghost styling all unchanged — they already key off `expanded`.

## Edge cases
- Re-clicking while expanded is a no-op (already true). Acceptable — collapse path is mouse-leave/blur, not re-click.
- Touch devices: no `mouseleave` fires, so once expanded the card stays open until the user taps outside or scrolls past. Acceptable for an advisory strip; no extra outside-click handler needed.
- Sub-materiality null return is unchanged.

## Out of scope
- Click-outside-to-close
- Animation easing changes
- Tier thresholds or copy

## Files
- **Modify**: `src/components/dashboard/sales/RetailPerformanceAlert.tsx` — swap toggle for expand+mouse-leave handlers

