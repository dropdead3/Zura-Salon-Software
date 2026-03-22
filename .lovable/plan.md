

## Dynamic Truncation for Services When Card is Swiped

**Problem:** The client name + services line has a fixed `pr-20` padding (for badge space), but when the card slides left to reveal action buttons, the visible area shrinks dramatically. The text spills into or behind the action buttons because the text container doesn't adapt to the reduced card width. The `truncate` CSS is applied, but the container itself is too wide relative to the visible area.

**Root cause:** The card content is rendered at full width inside the sliding `motion.div`. The `truncate` works, but the parent container doesn't shrink — the entire card slides, so `truncate` clips based on the full-width container, not the visible portion.

### Fix — `src/components/dock/schedule/DockAppointmentCard.tsx`

The card content `motion.div` already slides via `x` offset. The text inside needs to respect the *visible* width. The fix is to set `overflow-hidden` on the outer card container that stays in place, so as the card slides left, the content gets clipped at the card boundary.

1. **Add `overflow-hidden` to the static card wrapper** (the outer container that holds the sliding `motion.div`). This ensures that when the card translates left, any text extending beyond the visible card edge gets clipped automatically.

2. **Keep `truncate` on the `<p>` tag** (line 157) — this handles the resting-state text overflow.

3. **The `pr-20`** can stay for badge clearance since badges are `absolute` positioned.

This is a single class addition on the card's outer container — the one that doesn't move. The sliding `motion.div` moves inside it, and `overflow-hidden` on the static parent clips everything that extends past the visible boundary.

One line change, one file.

