import { useEffect, useRef, useState } from 'react';

export type ScrollDirection = 'up' | 'down' | null;

interface ScrollDirectionState {
  direction: ScrollDirection;
  isAtTop: boolean;
}

interface UseScrollDirectionOptions {
  /** Pixels of movement required before flipping direction. Filters trackpad jitter. */
  threshold?: number;
  /** ScrollY below this value forces `isAtTop = true`. */
  topOffset?: number;
}

/**
 * Tracks scroll direction on `window` using rAF-throttled reads.
 * Returns `null` direction on first mount to avoid animating on page load.
 */
export function useScrollDirection(options: UseScrollDirectionOptions = {}): ScrollDirectionState {
  const { threshold = 8, topOffset = 16 } = options;

  const [state, setState] = useState<ScrollDirectionState>(() => ({
    direction: null,
    isAtTop: typeof window === 'undefined' ? true : window.scrollY < topOffset,
  }));

  const lastY = useRef(typeof window === 'undefined' ? 0 : window.scrollY);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastY.current;
      const isAtTop = currentY < topOffset;

      if (Math.abs(diff) >= threshold) {
        const direction: ScrollDirection = diff > 0 ? 'down' : 'up';
        lastY.current = currentY;
        setState((prev) =>
          prev.direction === direction && prev.isAtTop === isAtTop
            ? prev
            : { direction, isAtTop }
        );
      } else {
        setState((prev) => (prev.isAtTop === isAtTop ? prev : { ...prev, isAtTop }));
      }
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, topOffset]);

  return state;
}
