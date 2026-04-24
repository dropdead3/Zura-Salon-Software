import { useEffect, useRef, useState } from 'react';

/**
 * useContainerSize
 * ResizeObserver-driven width/height of an element. rAF-throttled to avoid layout thrash.
 *
 * Returns: { ref, width, height }
 */
export function useContainerSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    let frame = 0;
    let pending: { width: number; height: number } | null = null;

    const flush = () => {
      frame = 0;
      const next = pending;
      pending = null;
      if (!next) return;
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        pending = { width: cr.width, height: cr.height };
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });

    ro.observe(el);

    // Seed initial size
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return { ref, width: size.width, height: size.height };
}
