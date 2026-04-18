import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useFirstSessionAnimation } from '@/hooks/useFirstSessionAnimation';
import { useIsAnimationsOff } from '@/hooks/useAnimationIntensity';

interface AnimatedNumberProps {
  value: number;
  /** @deprecated retained for API compat — fade timing is now centralized */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
  /** When set, the initial fade-in only runs once per browser session for this key. */
  animationKey?: string;
}

/**
 * Numeric display that fades on first reveal and crossfades on value change.
 * No counter roll-up — analytics doctrine prefers calm reveals over animated counting.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatOptions,
  animationKey,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const animationsOff = useIsAnimationsOff();
  const { shouldAnimate, markAnimated } = useFirstSessionAnimation(animationKey);
  const [hasRevealed, setHasRevealed] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  // Trigger first reveal on intersection (fade-in)
  useEffect(() => {
    if (reduceMotion || animationsOff) {
      setHasRevealed(true);
      return;
    }

    const el = spanRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRevealed) {
          setHasRevealed(true);
          if (shouldAnimate) markAnimated();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, animationsOff]);

  const formattedValue = formatOptions
    ? value.toLocaleString(undefined, formatOptions)
    : decimals > 0
      ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(value).toLocaleString();

  const display = `${prefix}${formattedValue}${suffix}`;

  // Reduced-motion / animations off: snap, no fade.
  if (reduceMotion || animationsOff) {
    return (
      <span ref={spanRef} className={className}>
        {display}
      </span>
    );
  }

  // First-mount snap when session gate already fired (no initial fade), but
  // value changes still crossfade.
  const initialOpacity = hasRevealed && !shouldAnimate ? 1 : 0;

  return (
    <span ref={spanRef} className={className} style={{ display: 'inline-block' }}>
      <AnimatePresence mode="wait" initial={false}>
        {hasRevealed && (
          <motion.span
            key={display}
            initial={{ opacity: initialOpacity, y: initialOpacity === 1 ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{
              opacity: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
            }}
            style={{ display: 'inline-block' }}
          >
            {display}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
