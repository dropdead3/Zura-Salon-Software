

## Fix Mix Session Icon to Slide with Card

**Problem:** The Flask icon (mix session indicator) is inside the static text overlay (`absolute inset-0 z-20`, line 128) which doesn't move during swipe. When the card slides left, the icon stays fixed and covers the "Finish Appt" button.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

**Fix:** Move the mix session indicator out of the static text overlay and into the sliding `motion.div` (the card background that drags). Specifically:

1. **Remove** the mix icon block from the static overlay (lines 172-179).

2. **Add** the mix icon as an absolutely-positioned element inside the sliding `motion.div` (after line 110, inside the card background). Position it `absolute top-4 right-4` so it visually matches its current location but now slides with the card.

3. **Remove** the spacer `div` for the mix icon in the invisible height-maintainer (line 122) — replace with the actual icon rendered in the sliding layer since it's now there.

This keeps the text static (per design intent) while ensuring the icon travels with the card background during swipe, no longer blocking the action tray.

