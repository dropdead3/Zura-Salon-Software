

## Diagnosis

The dashboard cards use `AnimatedBlurredAmount` (privacy-wrapped, hide-numbers aware), not `AnimatedNumber`. The previous fade refactor only touched `AnimatedNumber` and `useCounterAnimation`. `AnimatedBlurredAmount` still runs its own `requestAnimationFrame` count loop (`animateValue`, lines 133–157), interpolating from `previousValue → value` with a quint ease-out — which is exactly the cascading `$244.59 → $216.12 → … → $0.00` sequence the session replay shows.

22 files consume `AnimatedBlurredAmount` (the entire Sales card, Command Surface, KPI tiles), so fixing it here cleans up the whole dashboard in one shot.

## Fix

Replace the rAF interpolation in `AnimatedBlurredAmount.tsx` with the same `AnimatePresence` + `motion.span` keyed-on-formatted-value pattern already shipped in `AnimatedNumber`. Keep all surrounding behavior intact:

- Privacy: `hideNumbers` blur, click-to-reveal, double-click-to-hide tooltip, `TooltipProvider` wrapper
- Auto-compact: ResizeObserver, overflow detection, `compact`/`autoCompact` props
- Session-scoped first-mount gate via `useFirstSessionAnimation(animationKey)`
- Reduced-motion / animations-off snap-to-value
- Currency formatting (legacy + unified), decimals, prefix/suffix

Mechanics:
- Compute `formattedValue` directly from `value` (no more `displayValue` state)
- Wrap output in `AnimatePresence mode="wait" initial={false}` keyed on `displayContent`
- Mount: `opacity 0 → 1` over 300ms, `y: 4 → 0`; subsequent value changes crossfade (~150ms exit, ~250ms enter)
- Skip the fade entirely when reduced motion / animations off / hidden (blur is still applied)
- Drop `displayValue` state, `animateValue`, `animationRef`, the two `useEffect`s that drive rAF, and the now-unused `duration` prop usage (keep prop in interface for API compat — mark deprecated)

The `Tooltip`/`TooltipTrigger` wrapper stays as the outer element. The animated span sits inside it. `spanRef` (used for `ResizeObserver`) attaches to the outer wrapper or to a fixed inner span so width measurements remain stable across the crossfade — using the outer trigger span for measurement is safer because it doesn't unmount during the AnimatePresence swap.

## Out of scope
- Other primitives (`AnimatedNumber`, `useCounterAnimation`) — already done last loop
- Tuning per-card durations
- Privacy / blur / hide-numbers behavior
- Auto-compact thresholds and overflow detection
- `ChaChingToast`, `SilverShineWrapper`, chart animations

## Files
- **Modify**: `src/components/ui/AnimatedBlurredAmount.tsx` — drop rAF interpolation; render formatted value via `AnimatePresence + motion.span` keyed on `displayContent`. Keep privacy, auto-compact, session gate, reduced-motion handling, and prop API unchanged. Keep `spanRef` on a stable outer element so `ResizeObserver` keeps working.

