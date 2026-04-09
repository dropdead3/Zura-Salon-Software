import { useEffect, useRef, useCallback } from 'react';
import { useDashboardLock } from '@/contexts/DashboardLockContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const IDLE_TIMEOUT = 120_000; // 2 minutes
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart'] as const;

export function useAutoLock() {
  const { isLocked, lock } = useDashboardLock();
  const { isImpersonating } = useOrganizationContext();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isLocked) return;
    timeoutRef.current = setTimeout(() => lock(), IDLE_TIMEOUT);
  }, [isLocked, lock]);

  useEffect(() => {
    if (isLocked) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    resetTimer();

    const handler = () => resetTimer();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, handler, { passive: true });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, handler);
      }
    };
  }, [isLocked, resetTimer]);
}
