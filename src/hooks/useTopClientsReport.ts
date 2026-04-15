import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface TopClientEntry {
  clientName: string;
  clientId: string;
  totalSpend: number;
  visitCount: number;
  avgTicket: number;
  lastVisit: string;
  topService: string;
}

export function useTopClientsReport(filters: { dateFrom: string; dateTo: string; locationId?: string }) {
  return useQuery({
    queryKey: ['top-clients-report', filters],
    queryFn: async () => {
      const rows = await fetchAllBatched<{
        phorest_client_id: string | null;
        client_name: string | null;
        total_amount: number | null;
        transaction_date: string;
        item_name: string | null;
        item_type: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('phorest_client_id, client_name, total_amount, transaction_date, item_name, item_type')
          .gte('transaction_date', filters.dateFrom)
          .lte('transaction_date', filters.dateTo)
          .range(from, to);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        return q;
      });

      const clientMap = new Map<string, { name: string; spend: number; visits: Set<string>; lastVisit: string; services: Map<string, number> }>();

      for (const row of rows) {
        const id = row.phorest_client_id || 'walk-in';
        const entry = clientMap.get(id) || { name: row.client_name || 'Walk-in', spend: 0, visits: new Set(), lastVisit: '', services: new Map() };
        entry.spend += Number(row.total_amount) || 0;
        entry.visits.add(row.transaction_date);
        if (!entry.lastVisit || row.transaction_date > entry.lastVisit) entry.lastVisit = row.transaction_date;
        if (row.item_type === 'service' && row.item_name) {
          entry.services.set(row.item_name, (entry.services.get(row.item_name) || 0) + 1);
        }
        clientMap.set(id, entry);
      }

      const entries: TopClientEntry[] = Array.from(clientMap.entries())
        .filter(([id]) => id !== 'walk-in')
        .map(([id, v]) => {
          const visitCount = v.visits.size;
          let topService = 'N/A';
          let topCount = 0;
          for (const [svc, cnt] of v.services) {
            if (cnt > topCount) { topService = svc; topCount = cnt; }
          }
          return {
            clientName: v.name,
            clientId: id,
            totalSpend: v.spend,
            visitCount,
            avgTicket: visitCount > 0 ? v.spend / visitCount : 0,
            lastVisit: v.lastVisit,
            topService,
          };
        })
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 100);

      const totalRevenue = entries.reduce((s, e) => s + e.totalSpend, 0);
      return { entries, totalRevenue };
    },
    staleTime: 2 * 60_000,
  });
}
