import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface ServiceWeeklyTrend {
  serviceName: string;
  weeks: { weekStart: string; count: number }[];
  trend: 'rising' | 'stable' | 'declining';
  totalBookings: number;
}

export function useServiceDemandTrend(locationId?: string) {
  // Always look back 12 weeks from now
  const dateFrom = format(startOfWeek(subWeeks(new Date(), 12)), 'yyyy-MM-dd');
  const dateTo = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['service-demand-trend', locationId, dateFrom],
    queryFn: async () => {
      return fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('service_name, appointment_date')
          .neq('status', 'cancelled')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .range(from, to);

        if (locationId) {
          q = q.eq('location_id', locationId);
        }

        return q;
      });
    },
  });

  const trends = useMemo<ServiceWeeklyTrend[]>(() => {
    if (!query.data) return [];

    // Count per service per week
    const serviceCounts = new Map<string, Map<string, number>>();
    const serviceTotal = new Map<string, number>();

    for (const row of query.data) {
      if (!row.service_name || !row.appointment_date) continue;
      const weekStart = format(startOfWeek(new Date(row.appointment_date)), 'yyyy-MM-dd');

      if (!serviceCounts.has(row.service_name)) {
        serviceCounts.set(row.service_name, new Map());
        serviceTotal.set(row.service_name, 0);
      }
      const weeks = serviceCounts.get(row.service_name)!;
      weeks.set(weekStart, (weeks.get(weekStart) || 0) + 1);
      serviceTotal.set(row.service_name, (serviceTotal.get(row.service_name) || 0) + 1);
    }

    // Get top 8 by total bookings
    const sorted = [...serviceTotal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Generate all week starts
    const allWeeks: string[] = [];
    for (let i = 12; i >= 0; i--) {
      allWeeks.push(format(startOfWeek(subWeeks(new Date(), i)), 'yyyy-MM-dd'));
    }

    return sorted.map(([serviceName, total]) => {
      const weeks = serviceCounts.get(serviceName)!;
      const weekData = allWeeks.map(ws => ({
        weekStart: ws,
        count: weeks.get(ws) || 0,
      }));

      // Determine trend: compare first half avg to second half avg
      const mid = Math.floor(weekData.length / 2);
      const firstHalf = weekData.slice(0, mid);
      const secondHalf = weekData.slice(mid);
      const firstAvg = firstHalf.reduce((s, w) => s + w.count, 0) / (firstHalf.length || 1);
      const secondAvg = secondHalf.reduce((s, w) => s + w.count, 0) / (secondHalf.length || 1);

      let trend: 'rising' | 'stable' | 'declining' = 'stable';
      if (secondAvg > firstAvg * 1.2) trend = 'rising';
      else if (secondAvg < firstAvg * 0.8) trend = 'declining';

      return { serviceName, weeks: weekData, trend, totalBookings: total };
    });
  }, [query.data]);

  return { data: trends, isLoading: query.isLoading };
}
