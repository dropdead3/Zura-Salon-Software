import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HourlyTransaction {
  hour: number;
  count: number;
}

export function useTransactionsByHour(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['transactions-by-hour', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // Step 1: Get distinct POS client IDs for the date range
      let txQuery = supabase
        .from('phorest_transaction_items')
        .select('phorest_client_id')
        .not('phorest_client_id', 'is', null);

      if (dateFrom) txQuery = txQuery.gte('transaction_date', dateFrom);
      if (dateTo) txQuery = txQuery.lte('transaction_date', dateTo);
      if (locationId && locationId !== 'all') txQuery = txQuery.eq('location_id', locationId);

      const { data: txData, error: txError } = await txQuery;
      if (txError) throw txError;

      const posClientIds = new Set<string>();
      txData?.forEach(row => {
        if (row.phorest_client_id) posClientIds.add(row.phorest_client_id);
      });

      if (posClientIds.size === 0) {
        // No POS data — return empty range
        const result: HourlyTransaction[] = [];
        for (let h = 8; h <= 20; h++) {
          result.push({ hour: h, count: 0 });
        }
        return result;
      }

      // Step 2: Get earliest appointment start_time per POS client (for hour assignment)
      let aptQuery = supabase
        .from('phorest_appointments')
        .select('phorest_client_id, start_time')
        .not('phorest_client_id', 'is', null)
        .not('status', 'in', '("cancelled","no_show")');

      if (dateFrom) aptQuery = aptQuery.gte('appointment_date', dateFrom);
      if (dateTo) aptQuery = aptQuery.lte('appointment_date', dateTo);
      if (locationId && locationId !== 'all') aptQuery = aptQuery.eq('location_id', locationId);

      const { data: aptData, error: aptError } = await aptQuery;
      if (aptError) throw aptError;

      // For each POS client, find earliest appointment start_time
      const clientEarliestHour = new Map<string, number>();
      aptData?.forEach(row => {
        if (!row.phorest_client_id || !row.start_time || !posClientIds.has(row.phorest_client_id)) return;
        const hour = parseInt(row.start_time.split(':')[0]);
        const existing = clientEarliestHour.get(row.phorest_client_id);
        if (existing === undefined || hour < existing) {
          clientEarliestHour.set(row.phorest_client_id, hour);
        }
      });

      // Group by hour
      const hourMap: Record<number, number> = {};
      clientEarliestHour.forEach(hour => {
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      });

      // Fill 8AM-8PM range
      const result: HourlyTransaction[] = [];
      for (let h = 8; h <= 20; h++) {
        result.push({ hour: h, count: hourMap[h] || 0 });
      }
      return result;
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
