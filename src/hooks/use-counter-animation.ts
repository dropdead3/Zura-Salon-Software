import { useEffect, useRef, useState } from 'react';
import { useFirstSessionAnimation } from '@/hooks/useFirstSessionAnimation';
import { useIsAnimationsOff } from '@/hooks/useAnimationIntensity';

interface UseCounterAnimationProps {
  end: number;
  /** @deprecated retained for API compat — counter roll-up was removed in favor of fade. */
  duration?: number;
  decimals?: number;
  startOnView?: boolean;
  /** When set, marks the first mount in this session for the given key. */
  animationKey?: string;
}

/**
 * Returns the final formatted value immediately (no roll-up animation).
 *
 * Roll-up counter animations were replaced with a calmer fade-in pattern.
 * Consumers wanting a fade should wrap the value span in `AnimatePresence`
 * keyed on the value (see `AnimatedNumber` for the canonical pattern).
 *
 * Public API preserved: `{ count, ref, hasStarted }`.
 */
export function useCounterAnimation({
  end,
  decimals = 0,
  startOnView = false,
  animationKey,
}: UseCounterAnimationProps) {
  const animationsOff = useIsAnimationsOff();
  const { shouldAnimate, markAnimated } = useFirstSessionAnimation(animationKey);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(!startOnView);

  useEffect(() => {
    if (!startOnView) return;
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  // Mark the session gate once we've "started" so other consumers behave consistently.
  useEffect(() => {
    if (hasStarted && shouldAnimate && !animationsOff) {
      markAnimated();
    }
  }, [hasStarted, shouldAnimate, animationsOff, markAnimated]);

  const formattedCount = decimals > 0
    ? end.toFixed(decimals)
    : Math.floor(end).toLocaleString();

  return { count: formattedCount, ref: elementRef, hasStarted };
}
