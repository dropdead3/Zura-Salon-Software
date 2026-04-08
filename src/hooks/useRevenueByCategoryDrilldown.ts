import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory } from '@/utils/serviceCategorization';
import { resolveStaffNamesByPhorestIds } from '@/utils/resolveStaffNames';

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
      // Fetch transaction items for accurate POS revenue
      const allItems: any[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('phorest_transaction_items')
          .select('item_name, item_type, total_amount, tax_amount, phorest_staff_id, phorest_client_id, transaction_date')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(offset, offset + PAGE_SIZE - 1);

        if (locationId && locationId !== 'all') {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        allItems.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      // Also fetch appointment new/returning status for client classification
      const clientNewMap = new Map<string, boolean>();
      {
        let aptOffset = 0;
        let aptHasMore = true;
        while (aptHasMore) {
          let aptQuery = supabase
            .from('phorest_appointments')
            .select('phorest_client_id, is_new_client')
            .gte('appointment_date', dateFrom)
            .lte('appointment_date', dateTo)
            .not('status', 'in', '("cancelled","no_show")')
            .range(aptOffset, aptOffset + PAGE_SIZE - 1);

          if (locationId && locationId !== 'all') {
            aptQuery = aptQuery.eq('location_id', locationId);
          }

          const { data: aptData } = await aptQuery;
          (aptData || []).forEach((a: any) => {
            if (a.phorest_client_id && !clientNewMap.has(a.phorest_client_id)) {
              clientNewMap.set(a.phorest_client_id, a.is_new_client === true);
            }
          });
          aptHasMore = (aptData?.length || 0) === PAGE_SIZE;
          aptOffset += PAGE_SIZE;
        }
      }

      // Get staff name mappings via centralized resolver
      const staffIds = [...new Set(allItems.map(a => a.phorest_staff_id).filter(Boolean))];
      const staffNameMap = await resolveStaffNamesByPhorestIds(staffIds);

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

      allItems.forEach(item => {
        const category = item.item_type === 'service'
          ? getServiceCategory(item.item_name)
          : (item.item_type === 'product' ? 'Retail' : 'Other');
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const staffId = item.phorest_staff_id || 'unknown';
        const clientKey = item.phorest_client_id || 'walk-in';
        const isNew = clientNewMap.get(clientKey) === true;

        totalRevenue += amount;

        if (!categoryMap[category]) {
          categoryMap[category] = { revenue: 0, count: 0, stylists: {} };
        }
        categoryMap[category].revenue += amount;
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
        s.revenue += amount;
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
