import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface TipAnalysisEntry {
  staffName: string;
  staffId: string;
  totalTips: number;
  totalRevenue: number;
  appointmentCount: number;
  avgTipPerVisit: number;
  tipToRevenuePercent: number;
}

interface TipAnalysisFilters {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useTipAnalysisReport(filters: TipAnalysisFilters) {
  return useQuery({
    queryKey: ['tip-analysis-report', filters],
    queryFn: async (): Promise<{ entries: TipAnalysisEntry[]; totalTips: number; avgTipPercent: number }> => {
      // Fetch appointments with tips (deduplicated at checkout level)
      const rows = await fetchAllBatched<{
        staff_name: string | null;
        stylist_user_id: string | null;
        phorest_staff_id: string | null;
        tip_amount: number | null;
        total_price: number | null;
        appointment_date: string;
        phorest_client_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('staff_name, stylist_user_id, phorest_staff_id, tip_amount, total_price, appointment_date, phorest_client_id')
          .gte('appointment_date', filters.dateFrom)
          .lte('appointment_date', filters.dateTo)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to);

        if (filters.locationId) {
          q = q.eq('location_id', filters.locationId);
        }
        return q;
      });

      const staffMap = new Map<string, { name: string; tips: number; revenue: number; count: number }>();

      for (const row of rows) {
        const staffId = row.stylist_user_id || row.phorest_staff_id || 'unknown';
        const entry = staffMap.get(staffId) || { name: row.staff_name || 'Unknown', tips: 0, revenue: 0, count: 0 };
        entry.tips += Number(row.tip_amount) || 0;
        entry.revenue += Number(row.total_price) || 0;
        entry.count += 1;
        staffMap.set(staffId, entry);
      }

      let totalTips = 0;
      let totalRevenue = 0;

      const entries: TipAnalysisEntry[] = Array.from(staffMap.entries())
        .map(([staffId, v]) => {
          totalTips += v.tips;
          totalRevenue += v.revenue;
          return {
            staffName: v.name,
            staffId,
            totalTips: v.tips,
            totalRevenue: v.revenue,
            appointmentCount: v.count,
            avgTipPerVisit: v.count > 0 ? v.tips / v.count : 0,
            tipToRevenuePercent: v.revenue > 0 ? (v.tips / v.revenue) * 100 : 0,
          };
        })
        .filter(e => e.totalTips > 0)
        .sort((a, b) => b.totalTips - a.totalTips);

      return {
        entries,
        totalTips,
        avgTipPercent: totalRevenue > 0 ? (totalTips / totalRevenue) * 100 : 0,
      };
    },
    staleTime: 2 * 60_000,
  });
}
