

## Fix: Stationary Card Content + Visible Cancel/No-Show Buttons

**Two bugs:**
1. Card content moves with the swipe — it should stay fixed in place and dim
2. Cancel/No-Show buttons aren't visible because the card may not be sliding far enough or they're clipped

**Root cause:** The current structure places all card content inside the draggable `motion.div`. Per the original design, the background layer slides while the content stays stationary.

### Architecture (restore original pattern)

```text
┌─────────────────────────────────────────┐
│ .relative overflow-hidden               │
│                                         │
│  [Tray]        absolute right-0         │  ← action buttons, behind everything
│  [Sliding BG]  motion.div z-10          │  ← colored border/bg, drags left
│  [Static Info] absolute z-20            │  ← card content, stays in place, dims
│  [Flask icon]  absolute z-30            │  ← mix indicator, on sliding layer
└─────────────────────────────────────────┘
```

### Changes — `src/components/dock/schedule/DockAppointmentCard.tsx`

1. **Extract card content out of the draggable `motion.div`** — make it an `absolute inset-0 z-20` layer that does NOT move
2. **Add opacity dim** — use `useTransform` to dim content to 0.4 opacity as the card slides open
3. **Keep the draggable `motion.div` as background only** — it carries the border, bg color, and flask icon, but no text content
4. **Ensure the draggable layer height matches** — use `h-full` so the sliding background covers the card area

This restores the original interaction model where swiping reveals actions behind a dimming content overlay. The three scheduled buttons (Cancel, No-Show, Start) will be fully visible since the background slides away to expose the full 320px tray.

Single file change: `src/components/dock/schedule/DockAppointmentCard.tsx`

