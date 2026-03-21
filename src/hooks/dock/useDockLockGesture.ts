import { useRef, useEffect, useState, useCallback } from 'react';

interface UseDockLockGestureOptions {
  onLock: () => void;
  enabled?: boolean;
}

const ZONE_SIZE = 80;
const THRESHOLD = 60;
const MAX_HORIZONTAL_DRIFT = 30;

export function useDockLockGesture({ onLock, enabled = true }: UseDockLockGestureOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const touch = e.touches[0];
    const relX = touch.clientX - rect.left;
    const relY = touch.clientY - rect.top;

    // Only activate in bottom-right zone
    if (relX > rect.width - ZONE_SIZE && relY > rect.height - ZONE_SIZE) {
      startRef.current = { x: touch.clientX, y: touch.clientY };
      triggeredRef.current = false;
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startRef.current || triggeredRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startRef.current.x);
    const deltaY = startRef.current.y - touch.clientY; // positive = upward

    if (deltaX > MAX_HORIZONTAL_DRIFT) {
      startRef.current = null;
      setProgress(0);
      return;
    }

    if (deltaY > 0) {
      const p = Math.min(deltaY / THRESHOLD, 1);
      setProgress(p);

      if (p >= 1) {
        triggeredRef.current = true;
        setProgress(0);
        startRef.current = null;

        // Haptic feedback
        try {
          navigator.vibrate?.(15);
        } catch {}

        onLock();
      }
    } else {
      setProgress(0);
    }
  }, [onLock]);

  const handleTouchEnd = useCallback(() => {
    startRef.current = null;
    setProgress(0);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, progress };
}
