

## Goal
Fix the rubber-band counter on the Command Center hero ("$4,088.93 Revenue So Far Today") and make the count animation play **only on the first visit per browser session** — not every page mount/refocus/data refetch.

## Root cause

Two compounding problems in `src/components/ui/AnimatedBlurredAmount.tsx`:

1. **Wrong easing curve** — line 113-114 uses a damped-spring formula:
   ```
   settle = 1 - exp(-6p) * cos(4πp)
   ```
   The `cos(4π·p)` term oscillates between +1 and −1, causing the value to overshoot the target and snap back (the "rubber band"). This is *physics simulation* easing, not *information display* easing.

2. **Animates from 0 on every mount** — the `useEffect(() => { animateValue(0, value); }, [])` (line 88-93) fires every time the component mounts. Each navigation back to the Command Center, each tab switch that triggers a refetch, each parent rerender that unmounts/remounts the card → a fresh 0→value animation. Annoying.

Note: `AnimatedNumber.tsx` already uses quint ease-out (good, no overshoot). `useCounterAnimation.ts` has the same damped-spring bug but is less visible. We'll fix all three for consistency.

## Fix

### 1. Replace easing with quint ease-out (no overshoot, dramatic deceleration)
Match what `AnimatedNumber` already does:
```ts
const settle = 1 - Math.pow(1 - progress, 5);
```
Fast at the start, slows dramatically at the end, lands exactly on target. Reads as confident and executive — never "boingy."

### 2. Session-scoped first-mount gate
Use `sessionStorage` (matches the pattern already used across the app — `IncidentBanner`, `ClockInPromptDialog`, `useBirthdayNotifications`) keyed per counter identity:

```ts
const sessionKey = `counter-animated::${animationKey}`;
const hasAnimatedThisSession = sessionStorage.getItem(sessionKey) === '1';
```

- **First visit this session:** animate 0 → value, then mark animated.
- **Subsequent mounts this session:** snap to value instantly (no 0→value flash).
- **Value changes after first animation:** still animate the *delta* (e.g., revenue ticks up by $42), because that's a meaningful real-time change, not a remount artifact.
- **Session ends (browser/tab closed):** next visit re-animates once.

Add an opt-in `animationKey?: string` prop. When omitted, fall back to current behavior (animate every mount) so we don't disrupt existing call sites that intentionally re-animate. The Command Center hero passes a stable key like `command-center-revenue-today`.

### 3. Respect `prefers-reduced-motion`
Add `useReducedMotion()` check (already imported in `AnimatedNumber`). When set, snap directly to the value — no animation ever. Accessibility win + protects users who already opted out of motion.

## Files to modify

| File | Change |
|---|---|
| `src/components/ui/AnimatedBlurredAmount.tsx` | Replace damped-spring easing with quint ease-out; add `animationKey` prop + sessionStorage gate; honor `prefers-reduced-motion` |
| `src/hooks/use-counter-animation.ts` | Same easing fix (quint ease-out); same session gate via optional `animationKey` |
| `src/components/dashboard/AggregateSalesCard.tsx` | Pass `animationKey="cc-hero-revenue"` (and similar stable keys) on the 8 hero/secondary KPI counters so they animate once per session |

`AnimatedNumber.tsx` already uses quint ease-out — only needs the optional `animationKey` prop added for symmetry, and the sessionStorage gate. Will update for consistency.

## Out of scope
- Removing animation entirely (the count-up is a nice executive touch on first land — just needs to not be annoying)
- Re-tuning every counter site-wide in this pass (only the Command Center surfaces visible above the fold + the shared component fix; remaining call sites benefit automatically from the easing fix without per-site work)
- New design tokens for animation duration (current 1200ms is fine post-easing fix)

## Verification signal
- Hard refresh `/dashboard` → hero counter sweeps 0 → $4,088.93 with smooth deceleration, no overshoot, no rubber-band
- Navigate to `/dashboard/admin/sales` and back → hero counter is **already at value**, no re-animation
- Open a new tab to the dashboard → counter animates once (new session)
- Real-time revenue tick during the day ($4,088 → $4,130) → animates the delta only, not from 0
- With "reduce motion" enabled in OS → no animation at all, value just appears
- Other counters (`SalesStatsCard`, coaching summary, etc.) still animate, but with the calmer easing curve

