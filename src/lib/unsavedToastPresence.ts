/**
 * Unsaved-changes pill presence signal.
 *
 * The persistent <UnsavedChangesToast /> pill anchors to the bottom-right of
 * the viewport. Sonner success/error toasts render in the same region. Without
 * coordination, a "Hero section saved" toast appears stacked above the pill
 * (during the brief window where both are visible) and visually competes with
 * it.
 *
 * Mounted pills register themselves here; the global Sonner <Toaster /> reads
 * the count and pushes its `offset` upward by the pill's height + gap so the
 * two surfaces never overlap. When no pill is mounted, the toaster returns to
 * its default bottom inset.
 *
 * Consumers:
 *   - Publisher: `UnsavedChangesToast` (registerUnsavedToast on mount)
 *   - Subscriber: `Toaster` in `src/components/ui/sonner.tsx`
 */
import * as React from 'react';

let count = 0;
const listeners = new Set<(visible: boolean) => void>();

function notify() {
  const visible = count > 0;
  listeners.forEach((l) => l(visible));
}

export function registerUnsavedToast(): () => void {
  count += 1;
  notify();
  return () => {
    count = Math.max(0, count - 1);
    notify();
  };
}

export function useUnsavedToastVisible(): boolean {
  const [visible, setVisible] = React.useState(count > 0);
  React.useEffect(() => {
    listeners.add(setVisible);
    setVisible(count > 0);
    return () => {
      listeners.delete(setVisible);
    };
  }, []);
  return visible;
}
