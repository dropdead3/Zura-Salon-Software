import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface ClientTypeSegment {
  label: string;
  count: number;
  revenue: number;
  avgTicket: number;
  rebookingRate: number;
  rebookedCount: number;
}

export interface ClientTypeSplitData {
  newClients: ClientTypeSegment;
  returningClients: ClientTypeSegment;
  totalTransactions: number;
  overallRebookingRate: number;
}

interface UseClientTypeSplitOptions {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  enabled?: boolean;
}

export function useClientTypeSplit({ dateFrom, dateTo, locationId, enabled = true }: UseClientTypeSplitOptions) {
  return useQuery({
    queryKey: ['client-type-split', dateFrom, dateTo, locationId || 'all'],
    queryFn: async (): Promise<ClientTypeSplitData> => {
      // Step 1: Get distinct POS client IDs (source of truth for transaction count)
      const txData = await fetchAllBatched<{ external_client_id: string | null }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items')
          .select('external_client_id')
          .not('external_client_id', 'is', null)
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }
        return q;
      });

      const posClientIds = new Set<string>();
      txData.forEach(row => {
        if (row.external_client_id) posClientIds.add(row.external_client_id);
      });

      // Step 2: Get appointment data for new/returning classification + revenue
      const appointments = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('phorest_client_id, is_new_client, total_price, tip_amount, rebooked_at_checkout, appointment_date')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to);
        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }
        return q;
      });

      // Group by unique client visit (phorest_client_id + appointment_date)
      // Only include clients present in POS data
      const visitMap = new Map<string, { revenue: number; isNew: boolean; rebooked: boolean }>();
      (appointments || []).forEach(apt => {
        const clientId = apt.phorest_client_id;
        if (!clientId || !posClientIds.has(clientId)) return;
        
        const visitKey = `${clientId}|${apt.appointment_date}`;
        const existing = visitMap.get(visitKey);
        if (existing) {
          existing.revenue += (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);
        } else {
          visitMap.set(visitKey, {
            revenue: (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0),
            isNew: apt.is_new_client === true,
            rebooked: apt.rebooked_at_checkout === true,
          });
        }
      });

      // Deduplicate to one entry per client (use first visit's classification)
      const clientMap = new Map<string, { revenue: number; isNew: boolean; rebooked: boolean }>();
      visitMap.forEach((visit, key) => {
        const clientId = key.split('|')[0];
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, { ...visit });
        } else {
          const existing = clientMap.get(clientId)!;
          existing.revenue += visit.revenue;
        }
      });

      const newData = { count: 0, revenue: 0, rebooked: 0 };
      const retData = { count: 0, revenue: 0, rebooked: 0 };

      clientMap.forEach(visit => {
        if (visit.isNew) {
          newData.count += 1;
          newData.revenue += visit.revenue;
          if (visit.rebooked) newData.rebooked += 1;
        } else {
          retData.count += 1;
          retData.revenue += visit.revenue;
          if (visit.rebooked) retData.rebooked += 1;
        }
      });

      const total = newData.count + retData.count;
      const totalRebooked = newData.rebooked + retData.rebooked;

      return {
        newClients: {
          label: 'New Clients',
          count: newData.count,
          revenue: newData.revenue,
          avgTicket: newData.count > 0 ? newData.revenue / newData.count : 0,
          rebookingRate: newData.count > 0 ? Math.round((newData.rebooked / newData.count) * 100) : 0,
          rebookedCount: newData.rebooked,
        },
        returningClients: {
          label: 'Returning Clients',
          count: retData.count,
          revenue: retData.revenue,
          avgTicket: retData.count > 0 ? retData.revenue / retData.count : 0,
          rebookingRate: retData.count > 0 ? Math.round((retData.rebooked / retData.count) * 100) : 0,
          rebookedCount: retData.rebooked,
        },
        totalTransactions: total,
        overallRebookingRate: total > 0 ? Math.round((totalRebooked / total) * 100) : 0,
      };
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000,
  });
}
