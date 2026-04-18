

## Diagnosis

The dashboard currently uses two animation systems for numeric values:

1. **`AnimatedNumber`** (`src/components/ui/AnimatedNumber.tsx`) — counts from 0→value on mount via rAF loop with quint ease-out, and animates from previous→new value when value changes.
2. **`useCounterAnimation`** (`src/hooks/use-counter-animation.ts`) — same pattern, hook form, used by counter-style displays.

Both already respect `useReducedMotion` / `useIsAnimationsOff` and have a session-scoped first-mount gate (`useFirstSessionAnimation`). The roll-up behavior is what we want to replace.

The user wants: **no counter roll-up**. Instead:
- On first reveal: fade in (final number, no count).
- On filter change (value updates): fade old number out, fade new number in (crossfade or sequential).

## Design

Replace the rAF count loop in both primitives with an opacity-based fade using framer-motion's `AnimatePresence` keyed on the formatted value. Keep the public API identical (`value`, `prefix`, `suffix`, `decimals`, `formatOptions`, `className`, `animationKey`) so no consumers break.

Behavior:
- **Mount / first intersection**: render final value with `opacity: 0 → 1` over ~300ms, ease-out.
- **Value change**: `AnimatePresence mode="wait"` — old value fades out (~150ms) → new value fades in (~250ms). Total ~400ms, feels instantaneous but smooth.
- **Reduced motion / animations off**: snap to value, no opacity transition.
- **Session-scoped first animation gate**: still honored — if already animated this session for `animationKey`, render value at `opacity: 1` immediately on mount but still fade on subsequent value changes.
- **`useCounterAnimation` hook**: returns `{ count: formattedValue, ref, hasStarted }` as before. Internally drop the rAF loop; `count` is always the final formatted value. Add an `opacity` or `key` return so consumers can wire the fade themselves — OR simpler: leave the hook's `count` returning the final value and update the two-three consumers to wrap their span in `AnimatePresence`. Audit consumer count first.

## Scope of changes

1. **`src/components/ui/AnimatedNumber.tsx`** — replace rAF interpolation with framer-motion `AnimatePresence` + `motion.span` keyed on `formattedValue`. Keep prop API unchanged. Keep intersection-observer first-reveal trigger and session-scoped gate.

2. **`src/hooks/use-counter-animation.ts`** — drop rAF interpolation. `count` always equals final formatted value. Keep `ref` and `hasStarted` for backward compat. Add a brief note that fade should be applied at the consumer via `AnimatePresence` — and update consumers (likely 2–4 spots) to wrap their value span. Will audit during implementation.

3. **No token changes.** No new files. No styling changes beyond opacity/transform.

## Timing & easing

- Fade in (mount): 300ms, `ease: [0.16, 1, 0.3, 1]` (smooth ease-out)
- Fade out (value change): 150ms, ease-out
- Fade in (new value): 250ms, ease-out, ~50ms after fade-out completes via `mode="wait"`
- Optional subtle `y: 4 → 0` on enter for a touch of polish (4px, not more — matches narration animation in `DashboardShowcase.tsx`)

## Out of scope

- Removing animations from non-numeric surfaces (charts, badges)
- Changing the `ChaChingToast` shimmer or `SilverShineWrapper`
- Tuning per-card durations — single timing applies everywhere for consistency
- The `formatCurrency` / `BlurredAmount` privacy wrappers stay untouched

## Files
- **Modify**: `src/components/ui/AnimatedNumber.tsx` — swap rAF count loop for `AnimatePresence` + `motion.span` keyed on formatted value; preserve prop API, reduced-motion handling, session gate, and intersection-observer first-reveal.
- **Modify**: `src/hooks/use-counter-animation.ts` — remove rAF interpolation; return final formatted value immediately; preserve `ref` / `hasStarted` API.
- **Audit + lightly modify**: consumers of `useCounterAnimation` — wrap the displayed span in `AnimatePresence mode="wait"` keyed on the value so filter changes crossfade. Will enumerate during implementation (likely 2–4 files).

