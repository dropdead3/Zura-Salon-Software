

## Cool Entrance Animation After PIN Success

### Concept

After the PIN is validated, play a brief "unlock" transition before revealing the Dock UI. The PIN screen fades and scales out while the Dock content fades and scales in — a satisfying "portal opening" effect that feels premium.

### Implementation

**New file: `src/components/dock/DockUnlockTransition.tsx`**

A wrapper component that orchestrates a two-phase animation:

1. **Phase 1 — PIN screen exit (0–400ms):** The PIN gate content scales up slightly (1.02) and fades out, with the violet gradient intensifying briefly (a "flash" of the brand color).

2. **Phase 2 — Dock entrance (400–900ms):** The Dock layout fades in from a subtle scale-down (0.97→1) with a soft opacity ramp.

Uses `framer-motion` `AnimatePresence` with custom exit/enter variants. A brief violet radial pulse (opacity 0→0.15→0) overlays during the handoff for a "glow unlock" feel.

**Modify: `src/pages/Dock.tsx`**

- Add an `unlocked` state (`useState(false)`) that starts false.
- On `handlePinSuccess`, set staff as before but keep `unlocked = false` for ~500ms, then flip to `true`.
- Wrap the PIN gate and Dock layout in `AnimatePresence` keyed on the unlock state.
- The PIN gate gets exit animation (scale up + fade out).
- The Dock layout gets enter animation (scale up from 0.97 + fade in).

### Animation Spec (respecting motion standards)

Per project standards — no bouncy/elastic physics. Use smooth easing:

- **PIN exit:** `opacity: 1→0`, `scale: 1→1.03`, duration 350ms, ease `[0.4, 0, 0.2, 1]`
- **Violet pulse overlay:** `opacity: 0→0.2→0`, duration 500ms, centered radial gradient
- **Dock enter:** `opacity: 0→1`, `scale: 0.97→1`, duration 400ms, ease `[0, 0, 0.2, 1]`, delay 200ms after PIN exit starts

### Files

| Action | File |
|--------|------|
| Create | `src/components/dock/DockUnlockTransition.tsx` |
| Modify | `src/pages/Dock.tsx` — add unlock state + wrap in AnimatePresence |

