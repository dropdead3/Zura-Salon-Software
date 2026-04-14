

## Problem

The S710 Checkout Simulator shows both a "Splash" and an "Idle" screen as separate steps in the carousel, but on real Stripe terminal hardware these are the same screen — the splash/idle image is what displays when the reader isn't processing a transaction. Having both is misleading and redundant.

## Solution

Remove the "Idle" screen from the simulator entirely. The splash screen already represents the idle state.

### Changes

**File:** `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx`

1. **Remove `IdleScreen` component** (lines 140–176) — delete the entire function.
2. **Remove `'idle'` from `ScreenState` type** — change to `'splash' | 'cart' | 'tip' | 'tap' | 'processing' | 'success'`.
3. **Remove `'idle'` from `SCREEN_LABELS`** and **`SCREEN_DURATIONS`** maps.
4. **Remove `'idle'` from the `screens` array** (line 424) — change from `['splash', 'idle', 'cart', ...]` to `['splash', 'cart', ...]`.
5. **Remove the `idle` render branch** (line 481) — delete `{screen === 'idle' && <IdleScreen ... />}`.

**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

6. **Update brandable label** (line 169) — change `'Splash / idle screen'` to `'Splash screen'` since there's no longer a separate idle concept.

### Impact

The simulator carousel goes from 7 steps (splash → idle → cart → tip → tap → processing → success) to 6 steps (splash → cart → tip → tap → processing → success). The splash screen duration can be kept or slightly extended to compensate.

