import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TodayActualRevenueData {
  actualRevenue: number;
  actualServiceRevenue: number;
  actualProductRevenue: number;
  actualTransactions: number;
  actualServiceHours: number;
  actualAverageTicket: number;
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
  const queryClient = useQueryClient();


  // Realtime subscription: invalidate queries when POS sales data changes
  useEffect(() => {
    if (!enabled) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['today-actual-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['today-actual-revenue-by-location'] });
    };

    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'phorest_transaction_items',
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  // Today's service hours from appointments
  const serviceHoursQuery = useQuery({
    queryKey: ['today-service-hours', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('start_time, end_time')
        .eq('appointment_date', today)
        .not('status', 'in', '("cancelled","no_show")')
        .not('start_time', 'is', null)
        .not('end_time', 'is', null);

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      return data.reduce((sum, apt) => {
        const start = new Date(apt.start_time).getTime();
        const end = new Date(apt.end_time).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        return sum + (hours > 0 ? hours : 0);
      }, 0);
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
  });

  // Primary: POS transaction items (live data, single source of truth)
  const actualRevenueQuery = useQuery({
    queryKey: ['today-actual-revenue', today],
    queryFn: async () => {
      const { data: txnData, error: txnError } = await supabase
        .from('phorest_transaction_items')
        .select('item_type, total_amount, tax_amount, phorest_client_id')
        .gte('transaction_date', `${today}T00:00:00`)
        .lte('transaction_date', `${today}T23:59:59`);

      if (txnError) throw txnError;

      if (!txnData || txnData.length === 0) {
        return { totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, totalTransactions: 0, hasData: false, source: 'transactions' as const };
      }

      let serviceRevenue = 0;
      let productRevenue = 0;
      const clientIds = new Set<string>();

      const SERVICE_TYPES = new Set(['service', 'sale_fee', 'special_offer_item']);

      for (const row of txnData) {
        const amount = (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
        const itemType = (row.item_type || '').toLowerCase();
        if (SERVICE_TYPES.has(itemType)) {
          serviceRevenue += amount;
        } else {
          productRevenue += amount;
        }
        if (row.phorest_client_id) clientIds.add(row.phorest_client_id);
      }

      const totalRevenue = serviceRevenue + productRevenue;
      return {
        totalRevenue,
        serviceRevenue,
        productRevenue,
        totalTransactions: clientIds.size,
        hasData: totalRevenue > 0,
        source: 'transactions' as const,
      };
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

  // Per-location actual revenue (from transaction items)
  const locationActualRevenueQuery = useQuery({
    queryKey: ['today-actual-revenue-by-location', today],
    queryFn: async () => {
      // Fetch location mapping: phorest_branch_id → app location id
      const { data: locations } = await supabase
        .from('locations')
        .select('id, phorest_branch_id');
      const branchToAppId: Record<string, string> = {};
      if (locations) {
        for (const loc of locations) {
          if (loc.phorest_branch_id) {
            branchToAppId[loc.phorest_branch_id] = loc.id;
          }
        }
      }
      const resolveLocId = (rawId: string | null) => {
        const key = rawId || 'unknown';
        return branchToAppId[key] || key;
      };

      const { data: txnData, error: txnError } = await supabase
        .from('phorest_transaction_items')
        .select('location_id, item_type, total_amount, tax_amount, phorest_client_id')
        .gte('transaction_date', `${today}T00:00:00`)
        .lte('transaction_date', `${today}T23:59:59`);

      if (txnError) throw txnError;
      if (!txnData || txnData.length === 0) return {};

      const byLocation: Record<string, { actualRevenue: number; actualServiceRevenue: number; actualProductRevenue: number; actualTransactions: number }> = {};
      const clientsByLoc: Record<string, Set<string>> = {};

      for (const row of txnData) {
        const locId = resolveLocId(row.location_id);
        if (!byLocation[locId]) {
          byLocation[locId] = { actualRevenue: 0, actualServiceRevenue: 0, actualProductRevenue: 0, actualTransactions: 0 };
          clientsByLoc[locId] = new Set();
        }
        const amount = (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
        byLocation[locId].actualRevenue += amount;
        const itemType = (row.item_type || '').toLowerCase();
        const LOC_SERVICE_TYPES = new Set(['service', 'sale_fee', 'special_offer_item']);
        if (LOC_SERVICE_TYPES.has(itemType)) {
          byLocation[locId].actualServiceRevenue += amount;
        } else {
          byLocation[locId].actualProductRevenue += amount;
        }
        if (row.phorest_client_id) clientsByLoc[locId].add(row.phorest_client_id);
      }

      for (const locId of Object.keys(byLocation)) {
        byLocation[locId].actualTransactions = clientsByLoc[locId]?.size ?? 0;
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
      // Fetch location mapping for consistency
      const { data: locations } = await supabase
        .from('locations')
        .select('id, phorest_branch_id');
      const branchToAppId: Record<string, string> = {};
      if (locations) {
        for (const loc of locations) {
          if (loc.phorest_branch_id) {
            branchToAppId[loc.phorest_branch_id] = loc.id;
          }
        }
      }

      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('location_id, end_time')
        .eq('appointment_date', today)
        .not('status', 'in', '("cancelled","no_show")')
        .order('end_time', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return {};

      // Get max end_time per location (resolve branch IDs if needed)
      const byLocation: Record<string, string> = {};
      for (const row of data) {
        const rawId = row.location_id || 'unknown';
        const locId = branchToAppId[rawId] || rawId;
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

  // POS data only -- no appointment fallback
  const actualRevenue = actualRevenueQuery.data?.totalRevenue ?? 0;
  const actualTransactions = actualRevenueQuery.data?.totalTransactions ?? 0;
  const hasActualData = actualRevenueQuery.data?.hasData ?? false;

  const result: TodayActualRevenueData = {
    actualRevenue,
    actualServiceRevenue: actualRevenueQuery.data?.serviceRevenue ?? 0,
    actualProductRevenue: actualRevenueQuery.data?.productRevenue ?? 0,
    actualTransactions,
    actualServiceHours: serviceHoursQuery.data ?? 0,
    actualAverageTicket: actualTransactions > 0 ? actualRevenue / actualTransactions : 0,
    lastAppointmentEndTime: lastAppointmentQuery.data ?? null,
    hasActualData,
  };

  return {
    data: result,
    locationActuals,
    isLoading: actualRevenueQuery.isLoading || lastAppointmentQuery.isLoading || serviceHoursQuery.isLoading,
    dataUpdatedAt: actualRevenueQuery.dataUpdatedAt,
  };
}
