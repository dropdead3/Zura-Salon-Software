

## Convert Batch Bar to Fixed Floating Bar

### Problem
The batch action bar currently sits inside the Card as a sticky element at the bottom. When you scroll, it stays pinned to the card's bottom edge but remains visually attached to the table. The request is to make it a fixed floating bar at the bottom of the viewport, independent of the card.

### Solution
Update `AppointmentBatchBar` to render via a portal (`createPortal`) as a fixed bar at the bottom of the screen with glass-morphism styling, matching the platform's bento aesthetic.

### File Changed

**`src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx`**

1. Import `createPortal` from `react-dom` and `AnimatePresence` / `motion` from `framer-motion`.

2. Replace the current `<div className="sticky bottom-0 ...">` with a portaled, fixed-position bar:
   - Use `createPortal(..., document.body)` so it escapes the Card entirely.
   - Wrap in `AnimatePresence` + `motion.div` for a smooth slide-up entrance / exit.
   - Positioning: `fixed bottom-4 left-1/2 -translate-x-1/2 z-50` (centered, floating above the page bottom).
   - Styling: `bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl px-5 py-3` -- consistent with the platform's glass bento aesthetic.
   - Max width constrained (e.g., `max-w-2xl w-[calc(100%-2rem)]`) so it doesn't span the full viewport.

3. Animation: slide up from `y: 60, opacity: 0` to `y: 0, opacity: 1` using spring physics matching the platform standard (damping: 26, stiffness: 300, mass: 0.8).

4. The `ShareToDMDialog` stays outside the portal as it manages its own overlay.

### Visual Result
- Bar floats centered at the bottom of the screen, detached from the table card.
- Glass blur + rounded corners + shadow give it a premium feel.
- Smoothly animates in/out as selections change.
- No more corner-clipping concerns since it's no longer inside the Card.

