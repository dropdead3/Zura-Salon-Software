/**
 * useProcessingTimers — Ephemeral in-memory timer state for color processing.
 * Not persisted — lives only during the current session.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ProcessingTimer {
  id: string;
  label: string;
  startedAt: number; // Date.now()
  targetMinutes: number | null;
  stoppedAt: number | null;
}

export interface TimerSnapshot extends ProcessingTimer {
  elapsedMinutes: number;
  elapsedSeconds: number;
  percentComplete: number | null; // 0-100 if target set
  isOvertime: boolean;
  isWarning: boolean; // >= 90% of target
}

export function useProcessingTimers() {
  const [timers, setTimers] = useState<ProcessingTimer[]>([]);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second when timers are running
  useEffect(() => {
    const hasRunning = timers.some(t => !t.stoppedAt);
    if (hasRunning && !intervalRef.current) {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    } else if (!hasRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timers]);

  const startTimer = useCallback((id: string, label: string, targetMinutes?: number) => {
    setTimers(prev => {
      // Replace if same id exists
      const filtered = prev.filter(t => t.id !== id);
      return [...filtered, {
        id,
        label,
        startedAt: Date.now(),
        targetMinutes: targetMinutes ?? null,
        stoppedAt: null,
      }];
    });
  }, []);

  const stopTimer = useCallback((id: string) => {
    setTimers(prev => prev.map(t =>
      t.id === id && !t.stoppedAt ? { ...t, stoppedAt: Date.now() } : t,
    ));
  }, []);

  const removeTimer = useCallback((id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setTimers([]);
  }, []);

  const getSnapshots = useCallback((): TimerSnapshot[] => {
    const now = Date.now();
    return timers.map(t => {
      const end = t.stoppedAt ?? now;
      const elapsedMs = end - t.startedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const elapsedMinutes = elapsedSeconds / 60;
      const percentComplete = t.targetMinutes
        ? Math.min(100, (elapsedMinutes / t.targetMinutes) * 100)
        : null;
      return {
        ...t,
        elapsedMinutes,
        elapsedSeconds,
        percentComplete,
        isOvertime: t.targetMinutes ? elapsedMinutes > t.targetMinutes : false,
        isWarning: t.targetMinutes ? elapsedMinutes >= t.targetMinutes * 0.9 : false,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timers, tick]);

  return {
    timers: getSnapshots(),
    startTimer,
    stopTimer,
    removeTimer,
    clearAll,
    hasActiveTimers: timers.some(t => !t.stoppedAt),
  };
}
