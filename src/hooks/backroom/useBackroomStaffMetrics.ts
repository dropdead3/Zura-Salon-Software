/**
 * useBackroomStaffMetrics — Per-staff efficiency metrics for a date range.
 * Wraps useBackroomAnalytics data through the analytics engine.
 */

import { useMemo } from 'react';
import { useBackroomAnalytics } from './useBackroomAnalytics';
import { calculateStaffEfficiency, type StaffMetric } from '@/lib/backroom/analytics-engine';

export function useBackroomStaffMetrics(
  startDate: string,
  endDate: string,
  locationId?: string,
  staffId?: string
) {
  const { data, isLoading, error } = useBackroomAnalytics(startDate, endDate, locationId);

  const staffMetrics: StaffMetric[] = useMemo(() => {
    if (!data?.staffData?.length) return [];

    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );

    let metrics = calculateStaffEfficiency(data.staffData, daysInPeriod);

    if (staffId) {
      metrics = metrics.filter((m) => m.staffUserId === staffId);
    }

    return metrics.sort((a, b) => b.sessionsPerDay - a.sessionsPerDay);
  }, [data, startDate, endDate, staffId]);

  return { data: staffMetrics, isLoading, error };
}
