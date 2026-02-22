import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useSalesMetrics } from './useSalesData';
import { useAppointmentSummary } from './useOperationalAnalytics';
import { useRebookingRate } from './useRebookingRate';

/**
 * Quick stats for dashboard home: today's clients, this week revenue, new clients, rebooking rate.
 * Uses effective org scope via RLS; pass locationId to scope to one location or omit for aggregate.
 * Pass accessibleLocationIds to scope "new clients" to the user's locations (recommended for multi-tenant).
 */
export function useQuickStats(locationId?: string, accessibleLocationIds?: string[]) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const { data: todayAppointments } = useAppointmentSummary(today, today, locationId);
  const { data: metricsThisWeek } = useSalesMetrics({
    dateFrom: weekStart,
    dateTo: weekEnd,
    locationId: locationId === 'all' ? undefined : locationId,
  });
  const { data: rebookData } = useRebookingRate(sevenDaysAgo, today, locationId);
  const newClientsQuery = useQuery({
    queryKey: ['quick-stats-new-clients', sevenDaysAgo, today, accessibleLocationIds],
    queryFn: async () => {
      let query = supabase
        .from('phorest_clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_duplicate', false)
        .gte('first_visit', sevenDaysAgo)
        .lte('first_visit', today);
      if (accessibleLocationIds?.length) {
        query = query.in('location_id', accessibleLocationIds);
      } else if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const todayClients = todayAppointments?.total ?? 0;
  const thisWeekRevenue = metricsThisWeek?.totalRevenue ?? 0;
  const newClients = newClientsQuery.data ?? 0;
  const rebookingRate = rebookData?.rebookRate ?? 0;

  return {
    todayClients,
    thisWeekRevenue,
    newClients,
    rebookingRate,
    isLoading: newClientsQuery.isLoading || !todayAppointments || !rebookData,
  };
}
