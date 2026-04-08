import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useSalesMetrics } from './useSalesData';
import { useAppointmentSummary } from './useOperationalAnalytics';
import { useRebookingRate } from './useRebookingRate';

/**
 * Quick stats for dashboard home: today's clients, this week revenue, new clients, rebooking rate.
 * Uses dual-source client lookup: Zura-owned `clients` table first, falls back to `phorest_clients`.
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
      // Try Zura-owned clients table first (uses first_visit or client_since)
      let zuraQuery = supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('first_visit', sevenDaysAgo)
        .lte('first_visit', today);

      if (accessibleLocationIds?.length) {
        zuraQuery = zuraQuery.in('location_id', accessibleLocationIds);
      } else if (locationId && locationId !== 'all') {
        zuraQuery = zuraQuery.eq('location_id', locationId);
      }

      const { count: zuraCount, error: zuraError } = await zuraQuery;

      // Also check phorest_clients for historical data
      let phorestQuery = supabase
        .from('phorest_clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_duplicate', false)
        .gte('first_visit', sevenDaysAgo)
        .lte('first_visit', today);

      if (accessibleLocationIds?.length) {
        phorestQuery = phorestQuery.in('location_id', accessibleLocationIds);
      } else if (locationId && locationId !== 'all') {
        phorestQuery = phorestQuery.eq('location_id', locationId);
      }

      const { count: phorestCount } = await phorestQuery;

      // Return whichever is higher (avoids double-counting during transition)
      return Math.max(zuraCount ?? 0, phorestCount ?? 0);
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
