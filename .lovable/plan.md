

## Pull-Up-from-Bottom-Right to Lock Screen

### Concept

Add a touch gesture in the bottom-right corner of the Dock UI: when the user swipes upward from that zone (~80×80px), fire a haptic vibration and return to the PIN lock screen. This acts as a quick "lock" gesture, similar to how iOS uses corner swipes for system actions.

### Implementation

**New file: `src/hooks/dock/useDockLockGesture.ts`**

A custom hook that:
- Attaches `touchstart` / `touchmove` / `touchend` listeners to the provided container ref.
- Only activates when the touch starts in the bottom-right 80×80px zone.
- Tracks upward swipe distance; if it exceeds a threshold (~60px), triggers:
  1. `navigator.vibrate(15)` for haptic feedback (native Capacitor haptics can be added later).
  2. Calls the `onLock` callback.
- Shows a subtle visual hint: a small lock icon or upward chevron that fades in as the user drags, providing gesture discoverability.

**Modify: `src/components/dock/DockLayout.tsx`**

- Import and attach the lock gesture hook to the main dock content container.
- Pass `onLogout` as the `onLock` callback so it triggers the existing logout → lock screen flow.
- Add a small, semi-transparent lock icon (or chevron-up) in the bottom-right corner as a visual affordance — only visible on touch-capable devices, very subtle (opacity ~0.15).

**Modify: `src/pages/Dock.tsx`**

- No changes needed — `handleLogout` already resets `staff` and `unlocked` state, which returns to the PIN gate with the unlock transition in reverse.

### Gesture Spec

- **Activation zone:** Bottom-right 80×80px of the dock container.
- **Direction:** Upward swipe only (deltaY must be negative, deltaX within ±30px to avoid accidental triggers).
- **Threshold:** 60px upward travel to trigger.
- **Haptic:** `navigator.vibrate(15)` on web; for native Capacitor, use `@capacitor/haptics` `impact({ style: 'light' })` if available.
- **Visual feedback:** As the user drags up from the zone, a small lock icon scales from 0→1 with opacity tracking drag progress. Snaps back if gesture is abandoned.

### Files

| Action | File |
|--------|------|
| Create | `src/hooks/dock/useDockLockGesture.ts` |
| Modify | `src/components/dock/DockLayout.tsx` |

