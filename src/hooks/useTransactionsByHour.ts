import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface HourlyTransaction {
  hour: number;
  count: number;
}

export function useTransactionsByHour(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['transactions-by-hour', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // Step 1: Get distinct POS client IDs for the date range
      const txData = await fetchAllBatched<{ phorest_client_id: string | null }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('phorest_client_id')
          .not('phorest_client_id', 'is', null)
          .range(from, to);
        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      const posClientIds = new Set<string>();
      txData.forEach(row => {
        if (row.phorest_client_id) posClientIds.add(row.phorest_client_id);
      });

      if (posClientIds.size === 0) {
        const result: HourlyTransaction[] = [];
        for (let h = 8; h <= 20; h++) {
          result.push({ hour: h, count: 0 });
        }
        return result;
      }

      // Step 2: Get earliest appointment start_time per POS client (for hour assignment)
      const aptData = await fetchAllBatched<{ phorest_client_id: string | null; start_time: string | null }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('phorest_client_id, start_time')
          .not('phorest_client_id', 'is', null)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to);
        if (dateFrom) q = q.gte('appointment_date', dateFrom);
        if (dateTo) q = q.lte('appointment_date', dateTo);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      // For each POS client, find earliest appointment start_time
      const clientEarliestHour = new Map<string, number>();
      aptData.forEach(row => {
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
