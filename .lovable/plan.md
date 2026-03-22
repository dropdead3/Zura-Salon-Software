

## Dim Card Info on Swipe

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

**Changes:**

1. **Add a derived motion value** for text opacity — maps `x` from `[0, OPEN_OFFSET]` to `[1, 0.6]` (40% dim at full open).

2. **Wrap the static text overlay** (line 135, the `absolute inset-0 z-20` div) in a `motion.div` and bind `opacity` to the new motion value, so the card info dims smoothly as the card slides left.

Two small additions in one file — a `useTransform` call and swapping the static `div` for `motion.div` with the opacity style.

