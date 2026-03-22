

## Reposition Payment/Status Badges to Top-Right Corner

**Problem:** The status and payment badges are currently inline in the first row alongside the client name. Since there are no other icons in the top-right corner of the card, the badges should be absolutely positioned there for cleaner placement.

### Change — `src/components/dock/schedule/DockAppointmentCard.tsx`

1. **Move badges out of the flex row** (lines 146-163) and place them as an absolutely positioned element at the top of the `cardContent` block.

2. **Wrap `cardContent` in a `relative` container** so badges can be positioned `absolute top-0 right-0`.

3. **Badge positioning:** `absolute top-2 right-2` (or `top-3 right-3` for padding alignment) with `z-10` so they float above content.

4. **Remove the inline badge markup** from inside the `flex items-start gap-2` row.

Result: badges appear pinned to the top-right corner of each card, out of the content flow, clearly visible without competing with the client name line.

Single file, one structural move.

