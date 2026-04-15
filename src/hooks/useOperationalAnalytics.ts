import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, differenceInDays, addDays } from 'date-fns';

import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface DailyVolume {
  date: string;
  count: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
  dayOfWeek: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface AtRiskClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastVisit: string | null;
  daysSinceVisit: number;
  visitCount: number;
  totalSpend: number;
}

export interface RetentionMetrics {
  totalClients: number;
  returningClients: number;
  newClients: number;
  retentionRate: number;
  atRiskClients: number;
  atRiskClientsList: AtRiskClient[];
}

export interface LeadSlaMetrics {
  totalNewLeads: number;
  overdueLeads: number;
  averageResponseTime: number;
  slaBreachRate: number;
}

export type AnalyticsDateRange = 'tomorrow' | '7days' | '30days' | '90days';

export function useOperationalAnalytics(locationId?: string, dateRange: AnalyticsDateRange = '30days') {
  // Calculate date range
  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;
  
  switch (dateRange) {
    case 'tomorrow':
      startDate = addDays(today, 1);
      endDate = addDays(today, 1);
      break;
    case '7days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 7);
      break;
    case '30days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 30);
      break;
    case '90days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 90);
      break;
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(today, 'yyyy-MM-dd');

  // Fetch appointment volume data
  const volumeQuery = useQuery({
    queryKey: ['operational-analytics-volume', locationId, startDateStr, endDateStr],
    queryFn: async () => {
      const data = await fetchAllBatched<{ appointment_date: string; status: string }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('appointment_date, status')
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .eq('is_demo', false)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Group by date
      const volumeByDate = new Map<string, { count: number; completed: number; cancelled: number; noShow: number }>();
      
      (data || []).forEach(apt => {
        const date = apt.appointment_date;
        const existing = volumeByDate.get(date) || { count: 0, completed: 0, cancelled: 0, noShow: 0 };
        existing.count++;
        
        if (apt.status === 'completed') existing.completed++;
        if (apt.status === 'cancelled') existing.cancelled++;
        if (apt.status === 'no_show') existing.noShow++;
        
        volumeByDate.set(date, existing);
      });

      // Convert to array and sort
      const dailyVolume: DailyVolume[] = Array.from(volumeByDate.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return dailyVolume;
    },
  });

  // Fetch hourly distribution for heatmap
  const heatmapQuery = useQuery({
    queryKey: ['operational-analytics-heatmap', locationId, startDateStr, endDateStr],
    queryFn: async () => {
      const data = await fetchAllBatched<{ appointment_date: string; start_time: string }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('appointment_date, start_time')
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .not('status', 'in', '("cancelled","no_show")')
          .eq('is_demo', false)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Group by hour and day of week
      const distribution: HourlyDistribution[] = [];
      const hourDayMap = new Map<string, number>();

      (data || []).forEach(apt => {
        const date = parseISO(apt.appointment_date);
        const dayOfWeek = date.getDay();
        const hour = parseInt(apt.start_time.split(':')[0]);
        const key = `${dayOfWeek}-${hour}`;
        
        hourDayMap.set(key, (hourDayMap.get(key) || 0) + 1);
      });

      // Convert to array
      hourDayMap.forEach((count, key) => {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        distribution.push({ hour, dayOfWeek, count });
      });

      return distribution;
    },
  });

  // Fetch status breakdown
  const statusQuery = useQuery({
    queryKey: ['operational-analytics-status', locationId, startDateStr, endDateStr],
    queryFn: async () => {
      const data = await fetchAllBatched<{ status: string }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('status')
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .eq('is_demo', false)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Count by status
      const statusCounts = new Map<string, number>();
      (data || []).forEach(apt => {
        statusCounts.set(apt.status, (statusCounts.get(apt.status) || 0) + 1);
      });

      const total = data?.length || 0;
      const breakdown: StatusBreakdown[] = Array.from(statusCounts.entries())
        .map(([status, count]) => ({
          status,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return breakdown;
    },
  });

  // Fetch client retention metrics
  const retentionQuery = useQuery({
    queryKey: ['operational-analytics-retention', locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<{
        id: string; name: string | null; email: string | null; phone: string | null;
        visit_count: number; last_visit: string | null; total_spend: number | null; created_at: string;
      }>((from, to) => {
        let q = supabase
          .from('v_all_clients')
          .select('id, name, email, phone, visit_count, last_visit, total_spend, created_at')
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      const totalClients = data?.length || 0;
      const returningClients = (data || []).filter(c => c.visit_count > 1).length;
      const newClients = (data || []).filter(c => c.visit_count === 1).length;
      
      // At-risk: 2+ visits but no visit in 60+ days
      const atRiskClientsData = (data || []).filter(c => {
        if (c.visit_count < 2 || !c.last_visit) return false;
        return differenceInDays(new Date(), parseISO(c.last_visit)) >= 60;
      });

      // Build at-risk clients list with full details
      const atRiskClientsList: AtRiskClient[] = atRiskClientsData
        .map(c => ({
          id: c.id,
          name: c.name || 'Unknown',
          email: c.email,
          phone: c.phone,
          lastVisit: c.last_visit,
          daysSinceVisit: c.last_visit ? differenceInDays(new Date(), parseISO(c.last_visit)) : 0,
          visitCount: c.visit_count || 0,
          totalSpend: Number(c.total_spend) || 0,
        }))
        .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit); // Most overdue first

      const retentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;

      return {
        totalClients,
        returningClients,
        newClients,
        retentionRate,
        atRiskClients: atRiskClientsData.length,
        atRiskClientsList,
      } as RetentionMetrics;
    },
  });

  // Calculate summary stats including rebook rate
  const summary = useMemo(() => {
    const totalAppointments = volumeQuery.data?.reduce((sum, d) => sum + d.count, 0) || 0;
    const completedAppointments = volumeQuery.data?.reduce((sum, d) => sum + d.completed, 0) || 0;
    const noShowCount = volumeQuery.data?.reduce((sum, d) => sum + d.noShow, 0) || 0;
    const cancelledCount = volumeQuery.data?.reduce((sum, d) => sum + d.cancelled, 0) || 0;
    
    const noShowRate = totalAppointments > 0 
      ? (noShowCount / totalAppointments) * 100 
      : 0;
    const cancellationRate = totalAppointments > 0 
      ? (cancelledCount / totalAppointments) * 100 
      : 0;

    return {
      totalAppointments,
      completedAppointments,
      noShowCount,
      cancelledCount,
      noShowRate,
      cancellationRate,
    };
  }, [volumeQuery.data]);

  // Fetch rebook rate data
  const rebookQuery = useQuery({
    queryKey: ['operational-analytics-rebook', locationId, startDateStr, endDateStr],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('rebooked_at_checkout')
          .eq('status', 'completed')
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .eq('is_demo', false)
          .range(from, to);

        if (locationId) {
          q = q.eq('location_id', locationId);
        }

        return q;
      });

      const completed = data.length;
      const rebooked = data.filter(a => a.rebooked_at_checkout).length;
      const rebookRate = completed > 0 ? (rebooked / completed) * 100 : 0;

      return { completedCount: completed, rebookedCount: rebooked, rebookRate };
    },
  });

  return {
    dailyVolume: volumeQuery.data || [],
    hourlyDistribution: heatmapQuery.data || [],
    statusBreakdown: statusQuery.data || [],
    retention: retentionQuery.data,
    summary: {
      ...summary,
      rebookedCount: rebookQuery.data?.rebookedCount || 0,
      rebookRate: rebookQuery.data?.rebookRate || 0,
    },
    isLoading: volumeQuery.isLoading || heatmapQuery.isLoading || statusQuery.isLoading || retentionQuery.isLoading || rebookQuery.isLoading,
  };
}

export interface AppointmentSummary {
  total: number;
  completed: number;
  noShow: number;
  cancelled: number;
  noShowRate: number;
  cancellationRate: number;
  completionRate: number;
}

/** Appointment counts by status for a given date range (past or future). */
export function useAppointmentSummary(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['appointment-summary', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('status, phorest_client_id, appointment_date')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .eq('is_demo', false)
          .range(from, to);

        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }

        return q;
      });

      // Deduplicate by unique client visit (phorest_client_id + appointment_date)
      // Use first status encountered per visit; prioritize completed > no_show > cancelled > other
      const visitMap = new Map<string, string>();
      const statusPriority: Record<string, number> = { completed: 3, no_show: 2, cancelled: 1 };
      (data || []).forEach(a => {
        const key = a.phorest_client_id
          ? `${a.phorest_client_id}|${a.appointment_date}`
          : `row-${Math.random()}`;
        const existing = visitMap.get(key);
        const currentPriority = statusPriority[a.status || ''] || 0;
        const existingPriority = statusPriority[existing || ''] || 0;
        if (!existing || currentPriority > existingPriority) {
          visitMap.set(key, a.status || '');
        }
      });

      const statuses = Array.from(visitMap.values());
      const total = statuses.length;
      const completed = statuses.filter(s => s === 'completed').length;
      const noShow = statuses.filter(s => s === 'no_show').length;
      const cancelled = statuses.filter(s => s === 'cancelled').length;

      return {
        total,
        completed,
        noShow,
        cancelled,
        noShowRate: total > 0 ? (noShow / total) * 100 : 0,
        cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
      } as AppointmentSummary;
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
