import { useState, useEffect, useRef, ReactNode } from 'react';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatCurrency';

interface AnimatedBlurredAmountProps {
  value: number;
  /** When set, value is formatted as money in this currency (e.g. USD); prefix/suffix are ignored for the amount. */
  currency?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
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
}: AnimatedBlurredAmountProps) {
  const { hideNumbers, requestUnhide, quickHide } = useHideNumbers();
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();

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

  const formattedValue = currency
    ? formatCurrency(displayValue, currency, { maximumFractionDigits: resolvedDecimals, minimumFractionDigits: resolvedDecimals })
    : resolvedDecimals > 0
      ? displayValue.toFixed(resolvedDecimals)
      : Math.round(displayValue).toLocaleString();

  const handleClick = () => { if (hideNumbers) requestUnhide(); };
  const handleDoubleClick = () => { if (!hideNumbers) quickHide(); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && hideNumbers) requestUnhide(); };

  const displayContent = currency ? formattedValue : `${prefix}${formattedValue}${suffix}`;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              className,
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
        <TooltipContent>{hideNumbers ? 'Click to reveal' : 'Double-click to hide')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
