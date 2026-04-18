import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useFirstSessionAnimation } from '@/hooks/useFirstSessionAnimation';
import { useIsAnimationsOff } from '@/hooks/useAnimationIntensity';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
  /** When set, the 0→value mount animation only runs once per browser session for this key. */
  animationKey?: string;
}

export function AnimatedNumber({
  value,
  duration = 1200,
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
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();
  const spanRef = useRef<HTMLSpanElement>(null);

  // Trigger animation on first intersection
  useEffect(() => {
    if (reduceMotion || animationsOff) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }

    const el = spanRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          // Session-scoped first-mount gate
          if (!shouldAnimate) {
            setDisplayValue(value);
            previousValue.current = value;
            observer.disconnect();
            return;
          }
          markAnimated();

          animateValue(0, value);
          previousValue.current = value;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion, animationsOff]);

  // Animate on value change after initial animation
  useEffect(() => {
    if (reduceMotion || animationsOff) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }
    if (hasAnimated && value !== previousValue.current) {
      animateValue(previousValue.current, value);
      previousValue.current = value;
    }
  }, [value, hasAnimated, reduceMotion, animationsOff]);

  const animateValue = (from: number, to: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startTime = performance.now();
    const difference = to - from;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Quint ease-out — dramatic deceleration at the end
      const settle = 1 - Math.pow(1 - progress, 5);
      
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

  const formattedValue = formatOptions
    ? displayValue.toLocaleString(undefined, formatOptions)
    : decimals > 0
      ? displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(displayValue).toLocaleString();

  return (
    <span ref={spanRef} className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}
