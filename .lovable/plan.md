
Fix the card so the appointment details are truly anchored in place while only the background shell slides.

What’s happening now:
- The current card still uses the draggable `motion.div` as the main layout box and height source.
- Even though there is a static overlay, the interaction is only partially decoupled, so the visual result still feels like the card content is tied to the swipe.

Implementation plan:
1. Refactor `src/components/dock/schedule/DockAppointmentCard.tsx` to use a fully separated 4-layer structure:
   - Layer 1: static sizing shell in normal flow
   - Layer 2: action tray behind the card
   - Layer 3: sliding background shell (`motion.div`, absolute)
   - Layer 4: stationary content overlay (`motion.div`, absolute, opacity only)

2. Move the invisible sizing content out of the draggable layer:
   - Keep one non-visible sizing block in the root container so the card height is determined without relying on the sliding element.
   - Remove the current “invisible spacer inside the draggable layer” pattern.

3. Make the draggable background truly absolute:
   - Change the sliding `motion.div` to `absolute inset-0 z-10`.
   - Leave only background, border, and flask icon in that layer.
   - Do not place any text/content inside it.

4. Keep the appointment details in a separate stationary overlay:
   - Keep the client, services, time, and assistant info in `absolute inset-0 z-20`.
   - Retain the dimming effect with `contentOpacity`, but only animate opacity, never position.

5. Preserve the swipe tray behavior:
   - Keep scheduled cards at the wider 3-button reveal.
   - Keep active cards at the existing finish width.
   - Ensure the stationary overlay remains visible while the tray is exposed.

Technical notes:
- File: `src/components/dock/schedule/DockAppointmentCard.tsx`
- No backend changes needed.
- This is a structural UI fix, not a logic change.

Verification:
- Swipe a scheduled card left and confirm the text stays visually locked in place.
- Confirm Cancel / No Show / Start remain fully visible behind the sliding shell.
- Confirm active cards still reveal Finish correctly.
- Confirm the dimming remains subtle and the flask icon still travels with the sliding shell.
