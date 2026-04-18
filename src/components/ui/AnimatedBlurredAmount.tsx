import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { useFirstSessionAnimation } from '@/hooks/useFirstSessionAnimation';
import { useIsAnimationsOff } from '@/hooks/useAnimationIntensity';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { formatCurrency as formatCurrencyLegacy } from '@/lib/formatCurrency';
import { formatCurrency as formatCurrencyUnified } from '@/lib/format';

interface AnimatedBlurredAmountProps {
  value: number;
  /** When set, value is formatted as money in this currency (e.g. USD); prefix/suffix are ignored for the amount. */
  currency?: string;
  prefix?: string;
  suffix?: string;
  /** @deprecated Counter roll-up removed; fade timing is now centralized. Retained for API compat. */
  duration?: number;
  decimals?: number;
  className?: string;
  /** Use compact notation ($81.1K) instead of full numbers */
  compact?: boolean;
  /** Auto-detect overflow and switch to compact. Defaults to true when currency is set. */
  autoCompact?: boolean;
  /** When set, the initial fade-in only runs once per browser session for this key. Value-change crossfades still run. */
  animationKey?: string;
  children?: ReactNode;
}

/**
 * Privacy-aware numeric display. Fades in on first reveal and crossfades on value change.
 * No counter roll-up — analytics doctrine prefers calm reveals over animated counting.
 */
export function AnimatedBlurredAmount({
  value,
  currency,
  prefix = '',
  suffix = '',
  decimals,
  className = '',
  compact = false,
  autoCompact,
  animationKey,
}: AnimatedBlurredAmountProps) {
  const reduceMotion = useReducedMotion();
  const animationsOff = useIsAnimationsOff();
  const { shouldAnimate, markAnimated } = useFirstSessionAnimation(animationKey);
  const { hideNumbers, requestUnhide, quickHide } = useHideNumbers();
  const [hasMounted, setHasMounted] = useState(false);
  const [isAutoCompact, setIsAutoCompact] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  const shouldAutoCompact = autoCompact ?? !!currency;
  const useCompact = compact || isAutoCompact;
  const skipFade = reduceMotion || animationsOff;

  // Mark as mounted + fire session gate on first render
  useEffect(() => {
    setHasMounted(true);
    if (!skipFade && shouldAnimate) markAnimated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check overflow and toggle auto-compact
  const checkOverflow = useCallback(() => {
    const el = spanRef.current;
    if (!el || !shouldAutoCompact) return;
    if (Math.abs(value) < 1000) {
      setIsAutoCompact(false);
      return;
    }
    if (isAutoCompact) return;
    if (el.scrollWidth > el.clientWidth + 1) {
      setIsAutoCompact(true);
    }
  }, [shouldAutoCompact, value, isAutoCompact]);

  // Observe resize to re-check overflow
  useEffect(() => {
    const el = spanRef.current;
    if (!el || !shouldAutoCompact) return;
    let rafId: number;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => checkOverflow());
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, [shouldAutoCompact, checkOverflow]);

  // Re-check overflow when value changes
  useEffect(() => {
    requestAnimationFrame(() => checkOverflow());
  }, [value, checkOverflow]);

  const resolvedDecimals = decimals ?? (currency ? 2 : 0);

  const formattedValue = (() => {
    if (currency && useCompact) {
      return formatCurrencyUnified(value, { currency, compact: true, noCents: true });
    }
    if (currency) {
      return formatCurrencyLegacy(value, currency, { maximumFractionDigits: resolvedDecimals, minimumFractionDigits: resolvedDecimals });
    }
    if (useCompact) {
      return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(value);
    }
    return resolvedDecimals > 0
      ? value.toFixed(resolvedDecimals)
      : Math.round(value).toLocaleString();
  })();

  const handleClick = () => { if (hideNumbers) requestUnhide(); };
  const handleDoubleClick = () => { if (!hideNumbers) quickHide(); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && hideNumbers) requestUnhide(); };

  const displayContent = currency ? formattedValue : `${prefix}${formattedValue}${suffix}`;

  // First-mount snap when session gate already fired (no initial fade); value changes still crossfade.
  const initialOpacity = hasMounted && !shouldAnimate ? 1 : 0;

  // Track whether this is the very first reveal vs a value-change swap.
  // First reveal includes a tiny y-translation; value-change swaps are pure opacity crossfades.
  const isFirstReveal = !hasMounted || (initialOpacity === 0 && shouldAnimate);

  const inner = skipFade ? (
    <span style={{ display: 'inline-block' }}>{displayContent}</span>
  ) : (
    <AnimatePresence mode="wait" initial={true}>
      <motion.span
        key={displayContent}
        initial={{ opacity: initialOpacity, y: isFirstReveal && initialOpacity === 0 ? 4 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 0 }}
        transition={{
          opacity: { duration: isFirstReveal ? 0.5 : 0.5, ease: [0.16, 1, 0.3, 1] },
          y: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          exit: { opacity: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        }}
        style={{ display: 'inline-block' }}
      >
        {displayContent}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={spanRef}
            className={cn(
              className,
              shouldAutoCompact && 'overflow-hidden text-ellipsis whitespace-nowrap block',
              hideNumbers ? 'blur-md select-none cursor-pointer transition-all duration-200' : 'cursor-pointer'
            )}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            tabIndex={hideNumbers ? 0 : undefined}
          >
            {inner}
          </span>
        </TooltipTrigger>
        <TooltipContent>{hideNumbers ? 'Click to reveal' : 'Double-click to hide'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
