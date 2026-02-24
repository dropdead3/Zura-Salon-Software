import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory } from '@/utils/serviceCategorization';

export interface StylistCategoryBreakdown {
  category: string;
  revenue: number;
  count: number;
  sharePercent: number;
}

export interface StylistTicketData {
  phorestStaffId: string;
  staffName: string;
  avgTicket: number;
  totalRevenue: number;
  transactionCount: number;
  categories: StylistCategoryBreakdown[];
}

interface UseAvgTicketByStylistOptions {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  enabled?: boolean;
}

export function useAvgTicketByStylist({ dateFrom, dateTo, locationId, enabled = true }: UseAvgTicketByStylistOptions) {
  return useQuery({
    queryKey: ['avg-ticket-by-stylist', dateFrom, dateTo, locationId || 'all'],
    queryFn: async (): Promise<StylistTicketData[]> => {
      let query = supabase
        .from('phorest_appointments')
        .select('phorest_staff_id, total_price, service_name')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")')
        .not('total_price', 'is', null);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      // Staff name lookup
      const staffIds = [...new Set((appointments || []).map(a => a.phorest_staff_id).filter(Boolean))];
      const staffNameMap: Record<string, string> = {};

      if (staffIds.length > 0) {
        const { data: mappings } = await supabase
          .from('phorest_staff_mapping')
          .select('phorest_staff_id, phorest_staff_name, employee_profiles!phorest_staff_mapping_user_id_fkey(display_name, full_name)')
          .in('phorest_staff_id', staffIds);

        (mappings || []).forEach((m: any) => {
          staffNameMap[m.phorest_staff_id] = m.employee_profiles?.display_name || m.employee_profiles?.full_name || m.phorest_staff_name || 'Unknown';
        });
      }

      // Aggregate by stylist → category
      const stylistMap: Record<string, {
        revenue: number;
        count: number;
        categories: Record<string, { revenue: number; count: number }>;
      }> = {};

      (appointments || []).forEach(apt => {
        const staffId = apt.phorest_staff_id || 'unknown';
        const price = Number(apt.total_price) || 0;
        const category = getServiceCategory(apt.service_name);

        if (!stylistMap[staffId]) {
          stylistMap[staffId] = { revenue: 0, count: 0, categories: {} };
        }
        stylistMap[staffId].revenue += price;
        stylistMap[staffId].count += 1;

        if (!stylistMap[staffId].categories[category]) {
          stylistMap[staffId].categories[category] = { revenue: 0, count: 0 };
        }
        stylistMap[staffId].categories[category].revenue += price;
        stylistMap[staffId].categories[category].count += 1;
      });

      return Object.entries(stylistMap)
        .map(([staffId, data]) => ({
          phorestStaffId: staffId,
          staffName: staffNameMap[staffId] || 'Unknown',
          avgTicket: data.count > 0 ? data.revenue / data.count : 0,
          totalRevenue: data.revenue,
          transactionCount: data.count,
          categories: Object.entries(data.categories)
            .map(([category, c]) => ({
              category,
              revenue: c.revenue,
              count: c.count,
              sharePercent: data.revenue > 0 ? Math.round((c.revenue / data.revenue) * 100) : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue),
        }))
        .sort((a, b) => b.avgTicket - a.avgTicket);
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000,
  });
}
