import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { differenceInDays, subYears, format } from 'date-fns';

export interface AttritionEntry {
  clientId: string;
  clientName: string;
  lastVisitDate: string;
  daysSinceVisit: number;
  totalSpend: number;
  visitCount: number;
  avgTicket: number;
  riskTier: 'at-risk' | 'lapsed' | 'lost';
  staffName: string | null;
}

export interface AttritionSummary {
  atRiskCount: number;
  lapsedCount: number;
  lostCount: number;
  totalRevenueAtRisk: number;
  entries: AttritionEntry[];
}

interface AttritionFilters {
  asOfDate: string;
  locationId?: string;
  atRiskDays?: number;
  lapsedDays?: number;
  lostDays?: number;
}

export function useClientAttritionReport(filters: AttritionFilters) {
  const atRiskThreshold = filters.atRiskDays ?? 60;
  const lapsedThreshold = filters.lapsedDays ?? 90;
  const lostThreshold = filters.lostDays ?? 120;

  return useQuery({
    queryKey: ['client-attrition-report', filters],
    queryFn: async (): Promise<AttritionSummary> => {
      const lowerBound = format(subYears(new Date(filters.asOfDate), 2), 'yyyy-MM-dd');

      const rows = await fetchAllBatched<{
        phorest_client_id: string | null;
        client_name: string | null;
        appointment_date: string;
        total_price: number | null;
        staff_name: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('phorest_client_id, client_name, appointment_date, total_price, staff_name')
          .not('status', 'in', '("cancelled","no_show")')
          .gte('appointment_date', lowerBound)
          .range(from, to);

        if (filters.locationId) {
          q = q.eq('location_id', filters.locationId);
        }
        return q;
      });

      // Group by client
      const clientMap = new Map<string, {
        name: string;
        lastVisit: string;
        totalSpend: number;
        visitCount: number;
        lastStaff: string | null;
      }>();

      for (const row of rows) {
        const clientId = row.phorest_client_id || 'unknown';
        if (clientId === 'unknown') continue;

        const existing = clientMap.get(clientId);
        const spend = Number(row.total_price) || 0;

        if (!existing || row.appointment_date > existing.lastVisit) {
          clientMap.set(clientId, {
            name: existing?.name || row.client_name || 'Unknown Client',
            lastVisit: row.appointment_date,
            totalSpend: (existing?.totalSpend || 0) + spend,
            visitCount: (existing?.visitCount || 0) + 1,
            lastStaff: row.staff_name,
          });
        } else {
          existing.totalSpend += spend;
          existing.visitCount += 1;
        }
      }

      const today = new Date(filters.asOfDate);
      const entries: AttritionEntry[] = [];

      for (const [clientId, data] of clientMap) {
        const daysSince = differenceInDays(today, new Date(data.lastVisit));
        if (daysSince < atRiskThreshold) continue;

        let riskTier: 'at-risk' | 'lapsed' | 'lost';
        if (daysSince >= lostThreshold) riskTier = 'lost';
        else if (daysSince >= lapsedThreshold) riskTier = 'lapsed';
        else riskTier = 'at-risk';

        entries.push({
          clientId,
          clientName: data.name,
          lastVisitDate: data.lastVisit,
          daysSinceVisit: daysSince,
          totalSpend: data.totalSpend,
          visitCount: data.visitCount,
          avgTicket: data.visitCount > 0 ? data.totalSpend / data.visitCount : 0,
          riskTier,
          staffName: data.lastStaff,
        });
      }

      entries.sort((a, b) => b.totalSpend - a.totalSpend);

      return {
        atRiskCount: entries.filter(e => e.riskTier === 'at-risk').length,
        lapsedCount: entries.filter(e => e.riskTier === 'lapsed').length,
        lostCount: entries.filter(e => e.riskTier === 'lost').length,
        totalRevenueAtRisk: entries.reduce((sum, e) => sum + e.avgTicket * 6, 0), // ~6 visits/year value
        entries,
      };
    },
    staleTime: 5 * 60_000,
  });
}
