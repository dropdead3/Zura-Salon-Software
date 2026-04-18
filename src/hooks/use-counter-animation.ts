import { useState, useEffect, useRef } from 'react';

interface UseCounterAnimationProps {
  end: number;
  duration?: number;
  decimals?: number;
  startOnView?: boolean;
  /** When set, the 0→end animation only runs once per browser session for this key. */
  animationKey?: string;
}

export function useCounterAnimation({
  end,
  duration = 2000,
  decimals = 0,
  startOnView = false,
  animationKey,
}: UseCounterAnimationProps) {
  // If this counter has already animated this session, start at end value
  const initialCount = (() => {
    if (!animationKey) return 0;
    try {
      return sessionStorage.getItem(`counter-animated::${animationKey}`) === '1' ? end : 0;
    } catch { return 0; }
  })();
  const [count, setCount] = useState(initialCount);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (startOnView) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.1 }
      );
      if (elementRef.current) observer.observe(elementRef.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    // Session-scoped gate: snap to end if we've already animated this session
    if (animationKey) {
      try {
        if (sessionStorage.getItem(`counter-animated::${animationKey}`) === '1') {
          setCount(end);
          return;
        }
        sessionStorage.setItem(`counter-animated::${animationKey}`, '1');
      } catch { /* ignore */ }
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Quint ease-out: fast at start, smooth dramatic deceleration. No overshoot.
      const settle = 1 - Math.pow(1 - progress, 5);

      const currentCount = settle * end;
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, end, duration, animationKey]);

  const formattedCount = decimals > 0 
    ? count.toFixed(decimals) 
    : Math.floor(count).toLocaleString();

  return { count: formattedCount, ref: elementRef, hasStarted };
}
