

## Luxury Lock Animation Back to PIN Gate

### Problem

Currently, `handleLogout` sets `unlocked = false` and `staff = null` simultaneously, causing an instant swap with no exit animation for the Dock content.

### Solution

Create a two-phase logout: first animate the Dock out with a luxury ease-out, then reset staff state after the animation completes.

### Changes

**1. `src/pages/Dock.tsx` — Stagger the logout**

- Set `unlocked = false` first (triggers AnimatePresence exit on the dock)
- After a 500ms delay, set `staff = null` to fully reset
- This gives `DockUnlockTransition` time to animate the dock out and the gate in

**2. `src/components/dock/DockUnlockTransition.tsx` — Add dock exit + gate enter animations**

Currently the dock `motion.div` has no `exit` props (it only has `initial`/`animate`). Add:

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Dock exit | opacity 1→0, scale 1→0.96, y 0→8 | 400ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Gate enter | opacity 0→1, scale 1.02→1 | 350ms | cubic-bezier(0, 0, 0.2, 1), 100ms delay |

Also add a subtle pulse overlay on lock (mirror of the unlock pulse but cooler-toned).

Two files, small edits — no logic changes beyond the staggered timing.

