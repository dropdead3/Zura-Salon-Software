import { useEffect, useRef, useState } from 'react';

/**
 * Generic ResizeObserver-based container-width reader.
 *
 * Per the project's Container-Aware Responsiveness canon, layouts must
 * react to their own measured wrapper width — not to the viewport. This
 * hook returns a ref to attach to the container plus the latest measured
 * width in CSS pixels.
 *
 * Returns `null` until the first measurement lands, so callers can avoid
 * a hydration/SSR mismatch flash by treating `null` as "render the
 * default/safe layout".
 */
export function useContainerWidth<T extends HTMLElement = HTMLElement>(): {
  ref: React.RefObject<T>;
  width: number | null;
} {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
