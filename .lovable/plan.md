

## Fix Swipe UX — Static Text + Gap Between Card and Action Button

### Problem
Currently the entire card (background + text) slides left together, which looks jarring. The text should stay in place while only the card background moves to reveal the action button. Also needs more visual gap between card and action button.

### Approach — Layered Structure

Restructure the card into 3 layers:
1. **Action tray** (behind everything, right-aligned) — the "Finish Appt" button, moved further right with a gap
2. **Sliding background** (`motion.div`) — the card's border, background, and rounded corners. This is what moves on swipe.
3. **Static text overlay** — the appointment content sits on top, does NOT move. It's clipped by the outer container.

The text stays fixed because it's positioned absolutely on top of the sliding background, not inside it.

### File: `src/components/dock/schedule/DockAppointmentCard.tsx`

1. **Outer container**: `relative overflow-hidden rounded-xl` — clips everything
2. **Action button**: Move from `right-0` to `right-0` but add `pl-2` (8px gap between card edge and button). Increase `OPEN_OFFSET` from `-88` to `-96` to account for the gap.
3. **Card background**: `motion.div` with `style={{ x }}` — carries the bg color, border, rounded corners, but **no text content**. Sized to fill the container.
4. **Text content**: A separate `div` with `absolute inset-0 z-20 p-4 pointer-events-none` that holds all the appointment info. It does NOT move. The `pointer-events-none` lets drag events pass through to the background layer.
5. **Drag + tap handling**: The drag is on the background layer. The outer container handles click/tap.

### Changes Summary
- Split the single `motion.div` (card) into a sliding bg + static text overlay
- Add 8px gap between card and action button
- Adjust `OPEN_OFFSET` to `-96`

