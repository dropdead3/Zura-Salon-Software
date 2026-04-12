import { useMemo } from 'react';
import { isPast, parseISO, startOfDay, format } from 'date-fns';
import type { Task } from '@/hooks/useTasks';

interface DailyBriefingData {
  /** Top uncompleted tasks sorted by revenue impact then priority */
  topActions: Task[];
  /** Tasks expiring soon (within 48h) */
  urgentDecay: Task[];
  /** Total estimated revenue at risk from incomplete tasks */
  revenueAtRiskCents: number;
  /** Count of tasks completed today */
  completedToday: number;
}

/**
 * Derives daily briefing data from the user's task list.
 * Pure computation — no additional DB queries.
 */
export function useDailyBriefing(tasks: Task[]): DailyBriefingData {
  return useMemo(() => {
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');

    const activeTasks = tasks.filter((t) => !t.is_completed);
    const completedToday = tasks.filter(
      (t) => t.is_completed && t.completed_at && t.completed_at.startsWith(todayStr)
    ).length;

    // Sort by revenue impact (descending), then priority
    const prioWeight = { high: 3, normal: 2, low: 1 };
    const sorted = [...activeTasks]
      .filter((t) => !t.expires_at || !isPast(parseISO(t.expires_at)))
      .sort((a, b) => {
        const aImpact = a.estimated_revenue_impact_cents || 0;
        const bImpact = b.estimated_revenue_impact_cents || 0;
        if (bImpact !== aImpact) return bImpact - aImpact;
        return prioWeight[b.priority] - prioWeight[a.priority];
      });

    const topActions = sorted.slice(0, 3);

    // Tasks expiring within 48h
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const urgentDecay = activeTasks.filter(
      (t) => t.expires_at && !isPast(parseISO(t.expires_at)) && parseISO(t.expires_at) <= in48h
    );

    const revenueAtRiskCents = activeTasks.reduce(
      (sum, t) => sum + (t.estimated_revenue_impact_cents || 0),
      0
    );

    return { topActions, urgentDecay, revenueAtRiskCents, completedToday };
  }, [tasks]);
}
