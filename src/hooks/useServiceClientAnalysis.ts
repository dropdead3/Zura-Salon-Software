import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface ServiceClientRow {
  serviceName: string;
  totalCount: number;
  newClientCount: number;
  returningCount: number;
  newClientPct: number;
  rebookedCount: number;
  rebookRate: number;
  totalTips: number;
  avgTipPct: number; // avg tip as % of service price
  /** Per-stylist rebook breakdown */
  stylistRebook: { staffId: string; staffName: string; total: number; rebooked: number; rate: number }[];
}

export function useServiceClientAnalysis(
  dateFrom: string,
  dateTo: string,
  locationId?: string
) {
  const query = useQuery({
    queryKey: ['service-client-analysis', dateFrom, dateTo, locationId],
    queryFn: async () => {
      return fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('service_name, is_new_client, rebooked_at_checkout, tip_amount, total_price, phorest_staff_id')
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

  const result = useMemo<ServiceClientRow[]>(() => {
    if (!query.data) return [];

    const agg = new Map<string, {
      total: number;
      newClient: number;
      rebooked: number;
      totalTips: number;
      totalPrice: number;
      stylistMap: Map<string, { name: string; total: number; rebooked: number }>;
    }>();

    for (const a of query.data) {
      if (!a.service_name) continue;
      const existing = agg.get(a.service_name) || {
        total: 0, newClient: 0, rebooked: 0, totalTips: 0, totalPrice: 0,
        stylistMap: new Map(),
      };

      existing.total += 1;
      if (a.is_new_client) existing.newClient += 1;
      if (a.rebooked_at_checkout) existing.rebooked += 1;
      existing.totalTips += Number(a.tip_amount) || 0;
      // Use tip-adjusted price for accurate service revenue
      existing.totalPrice += (Number(a.total_price) || 0) - (Number(a.tip_amount) || 0);

      // Stylist rebook tracking
      const staffId = a.phorest_staff_id || 'unknown';
      const staffName = a.phorest_staff_id || 'Unknown';
      const stylistEntry = existing.stylistMap.get(staffId) || { name: staffName, total: 0, rebooked: 0 };
      stylistEntry.total += 1;
      if (a.rebooked_at_checkout) stylistEntry.rebooked += 1;
      existing.stylistMap.set(staffId, stylistEntry);

      agg.set(a.service_name, existing);
    }

    const rows: ServiceClientRow[] = [];
    for (const [name, d] of agg) {
      const stylistRebook = [...d.stylistMap.entries()]
        .map(([staffId, s]) => ({
          staffId,
          staffName: s.name,
          total: s.total,
          rebooked: s.rebooked,
          rate: s.total > 0 ? (s.rebooked / s.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      rows.push({
        serviceName: name,
        totalCount: d.total,
        newClientCount: d.newClient,
        returningCount: d.total - d.newClient,
        newClientPct: d.total > 0 ? (d.newClient / d.total) * 100 : 0,
        rebookedCount: d.rebooked,
        rebookRate: d.total > 0 ? (d.rebooked / d.total) * 100 : 0,
        totalTips: d.totalTips,
        avgTipPct: d.totalPrice > 0 ? (d.totalTips / d.totalPrice) * 100 : 0,
        stylistRebook,
      });
    }

    return rows.sort((a, b) => b.totalCount - a.totalCount);
  }, [query.data]);

  return { data: result, isLoading: query.isLoading };
}
