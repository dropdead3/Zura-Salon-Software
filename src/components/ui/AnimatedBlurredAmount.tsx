import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
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
  duration?: number;
  decimals?: number;
  className?: string;
  /** Use compact notation ($81.1K) instead of full numbers */
  compact?: boolean;
  /** Auto-detect overflow and switch to compact. Defaults to true when currency is set. */
  autoCompact?: boolean;
  children?: ReactNode;
}

export function AnimatedBlurredAmount({
  value,
  currency,
  prefix = '',
  suffix = '',
  duration = 1200,
  decimals,
  className = '',
  compact = false,
  autoCompact,
}: AnimatedBlurredAmountProps) {
  const { hideNumbers, requestUnhide, quickHide } = useHideNumbers();
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isAutoCompact, setIsAutoCompact] = useState(false);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();
  const spanRef = useRef<HTMLSpanElement>(null);

  const shouldAutoCompact = autoCompact ?? !!currency;
  const useCompact = compact || isAutoCompact;

  // Check overflow and toggle auto-compact
  const checkOverflow = useCallback(() => {
    const el = spanRef.current;
    if (!el || !shouldAutoCompact) return;
    // Only compact values >= 1000
    if (Math.abs(value) < 1000) {
      setIsAutoCompact(false);
      return;
    }
    // If already compact, check if we can un-compact by temporarily measuring full width
    if (isAutoCompact) {
      // Stay compact — we can't easily measure the non-compact width without flicker
      return;
    }
    // Check if text overflows its container
    if (el.scrollWidth > el.clientWidth + 1) {
      setIsAutoCompact(true);
    }
  }, [shouldAutoCompact, value, isAutoCompact]);

  // Observe resize to re-check overflow
  useEffect(() => {
    const el = spanRef.current;
    if (!el || !shouldAutoCompact) return;
    const ro = new ResizeObserver(() => {
      // When container grows, try un-compacting
      if (isAutoCompact && Math.abs(value) >= 1000) {
        setIsAutoCompact(false); // will re-check on next render
      }
      // Defer check to next frame after layout
      requestAnimationFrame(() => checkOverflow());
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [shouldAutoCompact, checkOverflow, isAutoCompact, value]);

  // Check overflow after value settles
  useEffect(() => {
    if (hasAnimated) {
      requestAnimationFrame(() => checkOverflow());
    }
  }, [displayValue, hasAnimated, checkOverflow]);

  // Animate on mount
  useEffect(() => {
    setHasAnimated(true);
    animateValue(0, value);
    previousValue.current = value;
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Animate on value change
  useEffect(() => {
    if (hasAnimated && value !== previousValue.current) {
      animateValue(previousValue.current, value);
      previousValue.current = value;
    }
  }, [value, hasAnimated]);

  const animateValue = (from: number, to: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startTime = performance.now();
    const difference = to - from;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Damped spring: overshoot ~5%, oscillate, settle
      const settle = 1 - Math.exp(-6 * progress) * Math.cos(4 * Math.PI * progress);
      
      setDisplayValue(from + difference * settle);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(to);
        previousValue.current = to;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const resolvedDecimals = decimals ?? (currency ? 2 : 0);

  const formattedValue = (() => {
    if (currency && useCompact) {
      return formatCurrencyUnified(displayValue, { currency, compact: true, noCents: true });
    }
    if (currency) {
      return formatCurrencyLegacy(displayValue, currency, { maximumFractionDigits: resolvedDecimals, minimumFractionDigits: resolvedDecimals });
    }
    if (useCompact) {
      return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(displayValue);
    }
    return resolvedDecimals > 0
      ? displayValue.toFixed(resolvedDecimals)
      : Math.round(displayValue).toLocaleString();
  })();

  const handleClick = () => { if (hideNumbers) requestUnhide(); };
  const handleDoubleClick = () => { if (!hideNumbers) quickHide(); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && hideNumbers) requestUnhide(); };

  const displayContent = currency ? formattedValue : `${prefix}${formattedValue}${suffix}`;

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
            {displayContent}
          </span>
        </TooltipTrigger>
        <TooltipContent>{hideNumbers ? 'Click to reveal' : 'Double-click to hide'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
