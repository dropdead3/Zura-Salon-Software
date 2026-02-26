import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TodayActualRevenueData {
  actualRevenue: number;
  actualServiceRevenue: number;
  actualProductRevenue: number;
  actualTransactions: number;
  lastAppointmentEndTime: string | null;
  hasActualData: boolean;
}

interface LocationActualData {
  actualRevenue: number;
  actualServiceRevenue: number;
  actualProductRevenue: number;
  actualTransactions: number;
  lastEndTime: string | null;
  hasActualData: boolean;
}

export function useTodayActualRevenue(enabled: boolean) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const actualRevenueQuery = useQuery({
    queryKey: ['today-actual-revenue', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('total_revenue, service_revenue, product_revenue, total_transactions')
        .eq('summary_date', today);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, totalTransactions: 0, hasData: false };
      }

      const totals = data.reduce(
        (acc, row) => ({
          totalRevenue: acc.totalRevenue + (Number(row.total_revenue) || 0),
          serviceRevenue: acc.serviceRevenue + (Number(row.service_revenue) || 0),
          productRevenue: acc.productRevenue + (Number(row.product_revenue) || 0),
          totalTransactions: acc.totalTransactions + (Number(row.total_transactions) || 0),
        }),
        { totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, totalTransactions: 0 }
      );

      return { ...totals, hasData: totals.totalRevenue > 0 };
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
  });

  const lastAppointmentQuery = useQuery({
    queryKey: ['today-last-appointment', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('end_time')
        .eq('appointment_date', today)
        .not('status', 'in', '("cancelled","no_show")')
        .order('end_time', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0]?.end_time || null;
    },
    enabled,
  });

  // Per-location actual revenue
  const locationActualRevenueQuery = useQuery({
    queryKey: ['today-actual-revenue-by-location', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('location_id, total_revenue, service_revenue, product_revenue, total_transactions')
        .eq('summary_date', today);

      if (error) throw error;
      if (!data || data.length === 0) return {};

      const byLocation: Record<string, { actualRevenue: number; actualServiceRevenue: number; actualProductRevenue: number; actualTransactions: number }> = {};
      for (const row of data) {
        const locId = row.location_id || 'unknown';
        if (!byLocation[locId]) {
          byLocation[locId] = { actualRevenue: 0, actualServiceRevenue: 0, actualProductRevenue: 0, actualTransactions: 0 };
        }
        byLocation[locId].actualRevenue += Number(row.total_revenue) || 0;
        byLocation[locId].actualServiceRevenue += Number(row.service_revenue) || 0;
        byLocation[locId].actualProductRevenue += Number(row.product_revenue) || 0;
        byLocation[locId].actualTransactions += Number(row.total_transactions) || 0;
      }
      return byLocation;
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
  });

  // Per-location last appointment end time
  const locationLastApptQuery = useQuery({
    queryKey: ['today-last-appointment-by-location', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('location_id, end_time')
        .eq('appointment_date', today)
        .not('status', 'in', '("cancelled","no_show")')
        .order('end_time', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return {};

      // Get max end_time per location
      const byLocation: Record<string, string> = {};
      for (const row of data) {
        const locId = row.location_id || 'unknown';
        if (!byLocation[locId]) {
          byLocation[locId] = row.end_time;
        }
      }
      return byLocation;
    },
    enabled,
  });

  // Build locationActuals map
  const locationActuals: Record<string, LocationActualData> = {};
  const revenueByLoc = locationActualRevenueQuery.data || {};
  const apptByLoc = locationLastApptQuery.data || {};
  const allLocIds = new Set([...Object.keys(revenueByLoc), ...Object.keys(apptByLoc)]);
  for (const locId of allLocIds) {
    const rev = revenueByLoc[locId];
    locationActuals[locId] = {
      actualRevenue: rev?.actualRevenue ?? 0,
      actualServiceRevenue: rev?.actualServiceRevenue ?? 0,
      actualProductRevenue: rev?.actualProductRevenue ?? 0,
      actualTransactions: rev?.actualTransactions ?? 0,
      lastEndTime: apptByLoc[locId] ?? null,
      hasActualData: (rev?.actualRevenue ?? 0) > 0,
    };
  }

  const result: TodayActualRevenueData = {
    actualRevenue: actualRevenueQuery.data?.totalRevenue ?? 0,
    actualServiceRevenue: actualRevenueQuery.data?.serviceRevenue ?? 0,
    actualProductRevenue: actualRevenueQuery.data?.productRevenue ?? 0,
    actualTransactions: actualRevenueQuery.data?.totalTransactions ?? 0,
    lastAppointmentEndTime: lastAppointmentQuery.data ?? null,
    hasActualData: actualRevenueQuery.data?.hasData ?? false,
  };

  return {
    data: result,
    locationActuals,
    isLoading: actualRevenueQuery.isLoading || lastAppointmentQuery.isLoading,
    dataUpdatedAt: actualRevenueQuery.dataUpdatedAt,
  };
}
