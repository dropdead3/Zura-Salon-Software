import { useRef, useEffect, useCallback } from 'react';

interface UseDockIdleTimerOptions {
  onIdle: () => void;
  timeout?: number;
  enabled?: boolean;
}

const IDLE_EVENTS = ['touchstart', 'pointerdown', 'pointermove', 'keydown'] as const;

export function useDockIdleTimer({ onIdle, timeout = 300_000, enabled = true }: UseDockIdleTimerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!enabled) return;
    timeoutRef.current = setTimeout(() => onIdleRef.current(), timeout);
  }, [timeout, enabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    // Start initial timer
    resetTimer();

    const handler = () => resetTimer();

    for (const evt of IDLE_EVENTS) {
      el.addEventListener(evt, handler, { passive: true });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const evt of IDLE_EVENTS) {
        el.removeEventListener(evt, handler);
      }
    };
  }, [enabled, resetTimer]);

  return { containerRef };
}
