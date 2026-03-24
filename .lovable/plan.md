

## Dismissable Alert Banners — Swipe & X to Clear

### Change — `src/components/dock/appointment/DockClientAlertsBanner.tsx`

Each banner card (Allergy, Booking Note, Profile Notes) becomes individually dismissable via:

1. **X button** — small `X` icon in the top-right corner of each card
2. **Swipe-to-dismiss** — horizontal swipe (left or right) using `framer-motion`'s `drag="x"` with a threshold; once dragged past ~100px, the card animates out and is removed from view

### Implementation

- Add `dismissed` state: `useState<Set<string>>` tracking which banner types (`'allergy' | 'booking' | 'profile'`) have been cleared (session-only, resets on navigation)
- Wrap each banner card in a `motion.div` with:
  - `drag="x"`, `dragConstraints={{ left: 0, right: 0 }}` (elastic snap-back)
  - `onDragEnd` handler: if `Math.abs(offset.x) > 100`, animate out (`opacity: 0, x: direction * 300`) then add to dismissed set
  - `AnimatePresence` around the list for exit animations
- Add an `X` (`lucide-react`) button absolutely positioned `top-2 right-2` on each card, semi-transparent, clicking adds to dismissed set
- Cards animate out with `exit={{ opacity: 0, height: 0, marginBottom: 0 }}` for smooth collapse

### One file changed

`src/components/dock/appointment/DockClientAlertsBanner.tsx` — add `motion`, `AnimatePresence`, `X` icon import; wrap each card; add dismiss state and handlers.

