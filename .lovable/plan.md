## Problem

The hero foreground "snaps through center" when slides change because:

1. **`AnimatePresence mode="wait"`** unmounts the outgoing slide before mounting the new one. Between frames, the foreground container has zero content, so the surrounding flex cell (`items-center justify-center`) reflows. When the new slide mounts, it visibly drops into place from a different baseline.
2. **`y: 20 → 0` enter + `y: -10` exit** translate values mean the content travels ~30px vertically through the transition — so even with a perfect crossfade, the eye sees a vertical "hop."
3. The motion `<div>` is **inline-block in the layout flow** (no absolute positioning), so the slides cannot occupy the same coordinate during the crossfade — they have to take turns, which forces the reflow.
4. The container's intrinsic width changes per slide (different headline length → different wrapper width because `max-w-4xl` shrink-wraps), so horizontal centering recomputes mid-transition and content appears to "shift toward center."

## Fix

Move the foreground slide into an **absolutely-stacked layer** so both the outgoing and incoming slide occupy the *same* coordinate space and crossfade in place — no reflow, no center-snap, no vertical hop.

### Changes — `src/components/home/HeroSlideRotator.tsx`

1. **Wrap the foreground in a `relative` positioning context** with a stable min-height so the parent flex cell doesn't collapse during the crossfade.

2. **Switch `AnimatePresence` from `mode="wait"` to `mode="sync"`** (matching the background layer) so old + new slides render simultaneously during the ~0.6s overlap.

3. **Make each `motion.div` slide `absolute inset-0`** with the alignment wrapper *inside it*, so both slides paint into the same box. Add `pointer-events-none` to the exiting slide via a CSS state hook (or rely on `AnimatePresence` removing it after exit completes).

4. **Drop the vertical `y` translate** — pure opacity crossfade is what makes it feel "seamless." Keep a tiny `y: 8 → 0` only on enter (no exit translate) if we want subtle motion, but default to opacity-only to match the user's "seamless" ask.

5. **Lengthen exit slightly** (e.g. `exit: { duration: 0.7 }`) so the outgoing slide is still ~30% visible when the new one reaches full opacity — this is the classic Slider-Revolution overlap that hides any sub-pixel layout difference.

6. **Stabilize the wrapper width** by moving `max-w-4xl mx-auto` (the alignment wrapper) up one level so it sits on the *positioning container*, not on each per-slide motion div. This way, horizontal centering is computed once on the outer box, not re-derived per slide content.

### Why this works

The background layer already does this correctly (absolute, opacity-only, `mode="sync"`) — that's why backgrounds crossfade smoothly while the foreground hops. We're applying the same pattern to the foreground.

For the **`background_only` mode** (where the key is `'fg-shared'`), nothing changes — there's only ever one foreground render, so `AnimatePresence` never triggers a transition. The fix is fully scoped to multi-slide mode.

### Out of scope

- No DB / schema changes.
- No editor UI changes.
- The `HeroSection` (single static hero) is unaffected — only the rotator transition is touched.
- `HeroNotes`, `HeroEyebrow`, and the rotating word continue to work as-is; they sit *inside* the slide and inherit the smoother transition.

### Files touched

- `src/components/home/HeroSlideRotator.tsx` (transition wrapper + motion props only)
- `src/components/home/HeroSlideRotator.test.tsx` (update the test that asserts the transition props if it pins exact `y` values)
