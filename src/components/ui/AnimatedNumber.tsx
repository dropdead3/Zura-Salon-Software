import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedNumber({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatOptions
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();

  // Animate on mount
  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }
    setHasAnimated(true);
    animateValue(0, value);
    previousValue.current = value;
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Animate on value change
  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      previousValue.current = value;
      return;
    }
    if (hasAnimated && value !== previousValue.current) {
      animateValue(previousValue.current, value);
      previousValue.current = value;
    }
  }, [value, hasAnimated, reduceMotion]);

  const animateValue = (from: number, to: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startTime = performance.now();
    const difference = to - from;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth ease-out cubic
      const settle = 1 - Math.pow(1 - progress, 3);
      
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
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}
