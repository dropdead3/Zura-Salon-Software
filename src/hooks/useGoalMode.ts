/**
 * useGoalMode — Lets stylists set a target date for level-up and
 * reverse-calculates the daily effort needed per KPI.
 *
 * Persistence: localStorage keyed by userId + levelSlug.
 * Pure client-side math — no database needed.
 */

import { useState, useMemo, useCallback } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import type { KpiProjection } from './useTrendProjection';

const STORAGE_PREFIX = 'zura_goal_date_';

function storageKey(userId: string, levelSlug: string) {
  return `${STORAGE_PREFIX}${userId}_${levelSlug}`;
}

export interface GoalKpiTarget {
  key: string;
  label: string;
  unit: string;
  gap: number;
  /** What's needed per day to close the gap by the target date */
  dailyNeeded: number;
  /** Human-readable daily target label */
  dailyLabel: string;
  /** 'achievable' | 'aggressive' | 'extreme' */
  feasibility: 'achievable' | 'aggressive' | 'extreme';
}

export interface GoalModeResult {
  /** The user-chosen target date, or null */
  targetDate: Date | null;
  /** Calendar days remaining until target */
  daysRemaining: number | null;
  /** Per-KPI reverse-calculated targets */
  goalTargets: GoalKpiTarget[];
  /** Overall feasibility label */
  overallFeasibility: 'achievable' | 'aggressive' | 'extreme';
  /** Set or clear the target date */
  setTargetDate: (date: Date | null) => void;
  /** Whether goal mode is active */
  isActive: boolean;
}

function computeFeasibility(dailyNeeded: number, gap: number, daysRemaining: number): 'achievable' | 'aggressive' | 'extreme' {
  // If more than 90 days, almost anything is achievable
  if (daysRemaining >= 90) return 'achievable';
  // Use ratio: gap / daysRemaining relative to a "comfortable" baseline of gap / 90
  const comfortableDaily = gap / 90;
  if (comfortableDaily <= 0) return 'achievable';
  const ratio = dailyNeeded / comfortableDaily;
  if (ratio <= 1.5) return 'achievable';
  if (ratio <= 3) return 'aggressive';
  return 'extreme';
}

function getDailyLabel(key: string, dailyNeeded: number, unit: string): string {
  switch (key) {
    case 'revenue':
      return `+$${Math.ceil(dailyNeeded).toLocaleString()}/day`;
    case 'retail':
    case 'rebooking':
    case 'retention_rate':
    case 'utilization':
      return `+${dailyNeeded.toFixed(2)} pts/day`;
    case 'avg_ticket':
      return `+$${Math.ceil(dailyNeeded)}/visit`;
    case 'rev_per_hour':
      return `+$${Math.ceil(dailyNeeded)}/hr`;
    case 'new_clients': {
      const perWeek = Math.round(dailyNeeded * 7 * 10) / 10;
      return `+${perWeek}/week`;
    }
    default:
      return `+${dailyNeeded.toFixed(1)} ${unit}/day`;
  }
}

export function useGoalMode(
  userId: string | undefined,
  levelSlug: string | undefined,
  projections: KpiProjection[],
): GoalModeResult {
  const key = userId && levelSlug ? storageKey(userId, levelSlug) : null;

  const [targetDate, setTargetDateState] = useState<Date | null>(() => {
    if (!key) return null;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const d = new Date(stored);
        // Only use if in the future
        if (d > new Date()) return d;
        localStorage.removeItem(key);
      }
    } catch {}
    return null;
  });

  const setTargetDate = useCallback((date: Date | null) => {
    setTargetDateState(date);
    if (key) {
      if (date) {
        localStorage.setItem(key, date.toISOString());
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [key]);

  const daysRemaining = targetDate
    ? Math.max(1, differenceInCalendarDays(targetDate, new Date()))
    : null;

  const goalTargets = useMemo<GoalKpiTarget[]>(() => {
    if (!daysRemaining || !projections.length) return [];

    return projections
      .filter(p => !p.isMet && p.gap > 0)
      .map(p => {
        // For revenue, gap is monthly; convert to daily
        let dailyNeeded: number;
        if (p.key === 'revenue') {
          // Total revenue gap to close = gap (monthly) — but we need the total shortfall over the period
          // The gap represents the monthly shortfall. Over daysRemaining, they need to raise their monthly average by `gap`.
          // Simplified: dailyNeeded = gap / 30 (they need this much extra per day on average)
          dailyNeeded = p.gap / 30;
        } else {
          dailyNeeded = p.gap / daysRemaining;
        }

        return {
          key: p.key,
          label: p.label,
          unit: p.unit,
          gap: p.gap,
          dailyNeeded,
          dailyLabel: getDailyLabel(p.key, dailyNeeded, p.unit),
          feasibility: computeFeasibility(dailyNeeded, p.gap, daysRemaining),
        };
      });
  }, [projections, daysRemaining]);

  const overallFeasibility = useMemo(() => {
    if (goalTargets.length === 0) return 'achievable' as const;
    if (goalTargets.some(t => t.feasibility === 'extreme')) return 'extreme' as const;
    if (goalTargets.some(t => t.feasibility === 'aggressive')) return 'aggressive' as const;
    return 'achievable' as const;
  }, [goalTargets]);

  return {
    targetDate,
    daysRemaining,
    goalTargets,
    overallFeasibility,
    setTargetDate,
    isActive: !!targetDate,
  };
}
