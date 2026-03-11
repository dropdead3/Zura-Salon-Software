import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory } from '@/utils/serviceCategorization';
import { formatDisplayName } from '@/lib/utils';

export interface CategoryStylistData {
  phorestStaffId: string;
  staffName: string;
  revenue: number;
  count: number;
  sharePercent: number;
  newClients: number;
  returningClients: number;
  totalClients: number;
}

export interface CategoryBreakdownData {
  category: string;
  revenue: number;
  count: number;
  sharePercent: number;
  stylists: CategoryStylistData[];
}

interface UseRevenueByCategoryDrilldownOptions {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  enabled?: boolean;
}

export function useRevenueByCategoryDrilldown({
  dateFrom,
  dateTo,
  locationId,
  enabled = true,
}: UseRevenueByCategoryDrilldownOptions) {
  return useQuery({
    queryKey: ['revenue-by-category-drilldown', dateFrom, dateTo, locationId || 'all'],
    queryFn: async (): Promise<CategoryBreakdownData[]> => {
      // Fetch appointments with service info, staff, and client new/returning status
      let query = supabase
        .from('phorest_appointments')
        .select('service_name, total_price, phorest_staff_id, is_new_client, client_name')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")')
        .not('total_price', 'is', null);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      // Get staff name mappings
      const staffIds = [...new Set((appointments || []).map(a => a.phorest_staff_id).filter(Boolean))];
      const staffNameMap: Record<string, string> = {};

      if (staffIds.length > 0) {
        const { data: mappings } = await supabase
          .from('phorest_staff_mapping')
          .select('phorest_staff_id, phorest_staff_name, employee_profiles!phorest_staff_mapping_user_id_fkey(display_name, full_name)')
          .in('phorest_staff_id', staffIds);

        (mappings || []).forEach((m: any) => {
          const name = m.employee_profiles ? formatDisplayName(m.employee_profiles.full_name || '', m.employee_profiles.display_name) : (m.phorest_staff_name ? formatDisplayName(m.phorest_staff_name) : 'Unknown');
          staffNameMap[m.phorest_staff_id] = name;
        });
      }

      // Aggregate by category → stylist
      const categoryMap: Record<string, {
        revenue: number;
        count: number;
        stylists: Record<string, {
          revenue: number;
          count: number;
          newClients: Set<string>;
          returningClients: Set<string>;
          allClients: Set<string>;
        }>;
      }> = {};

      let totalRevenue = 0;

      (appointments || []).forEach(apt => {
        const category = getServiceCategory(apt.service_name);
        const price = Number(apt.total_price) || 0;
        const staffId = apt.phorest_staff_id || 'unknown';
        const clientKey = apt.client_name || 'walk-in';
        const isNew = apt.is_new_client === true;

        totalRevenue += price;

        if (!categoryMap[category]) {
          categoryMap[category] = { revenue: 0, count: 0, stylists: {} };
        }
        categoryMap[category].revenue += price;
        categoryMap[category].count += 1;

        if (!categoryMap[category].stylists[staffId]) {
          categoryMap[category].stylists[staffId] = {
            revenue: 0,
            count: 0,
            newClients: new Set(),
            returningClients: new Set(),
            allClients: new Set(),
          };
        }
        const s = categoryMap[category].stylists[staffId];
        s.revenue += price;
        s.count += 1;
        s.allClients.add(clientKey);
        if (isNew) {
          s.newClients.add(clientKey);
        } else {
          s.returningClients.add(clientKey);
        }
      });

      // Convert to sorted array
      const result: CategoryBreakdownData[] = Object.entries(categoryMap)
        .map(([category, data]) => ({
          category,
          revenue: data.revenue,
          count: data.count,
          sharePercent: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
          stylists: Object.entries(data.stylists)
            .map(([staffId, s]) => ({
              phorestStaffId: staffId,
              staffName: staffNameMap[staffId] || 'Unknown',
              revenue: s.revenue,
              count: s.count,
              sharePercent: data.revenue > 0 ? Math.round((s.revenue / data.revenue) * 100) : 0,
              newClients: s.newClients.size,
              returningClients: s.returningClients.size,
              totalClients: s.allClients.size,
            }))
            .sort((a, b) => b.revenue - a.revenue),
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return result;
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000,
  });
}
