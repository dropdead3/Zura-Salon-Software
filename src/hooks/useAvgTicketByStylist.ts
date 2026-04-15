import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory } from '@/utils/serviceCategorization';
import { resolveStaffNamesByPhorestIds } from '@/utils/resolveStaffNames';
import { formatDisplayName } from '@/lib/utils';

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
      // Fetch transaction items for accurate POS revenue
      const allItems: any[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('v_all_transaction_items' as any)
          .select('staff_user_id, total_amount, tax_amount, item_name, item_type, phorest_client_id, transaction_date')
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

      // Staff name lookup via centralized resolver (handles both phorest_staff_id and user_id)
      const staffIds = [...new Set(allItems.map(a => a.staff_user_id).filter(Boolean))];
      const staffNameMap = await resolveStaffNamesByPhorestIds(staffIds);

      // Aggregate by stylist → category, using unique client visits for avg ticket
      const stylistMap: Record<string, {
        revenue: number;
        count: number;
        clientVisits: Set<string>;
        categories: Record<string, { revenue: number; count: number }>;
      }> = {};

      allItems.forEach(item => {
        const staffId = item.staff_user_id || 'unknown';
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();
        const category = itemType === 'service'
          ? getServiceCategory(item.item_name)
          : (itemType === 'product' ? 'Retail' : 'Other');

        if (!stylistMap[staffId]) {
          stylistMap[staffId] = { revenue: 0, count: 0, clientVisits: new Set(), categories: {} };
        }
        stylistMap[staffId].revenue += amount;
        stylistMap[staffId].count += 1;

        // Track unique client visits for avg ticket denominator
        const visitKey = `${item.phorest_client_id || 'walk-in'}|${item.transaction_date}`;
        stylistMap[staffId].clientVisits.add(visitKey);

        if (!stylistMap[staffId].categories[category]) {
          stylistMap[staffId].categories[category] = { revenue: 0, count: 0 };
        }
        stylistMap[staffId].categories[category].revenue += amount;
        stylistMap[staffId].categories[category].count += 1;
      });

      return Object.entries(stylistMap)
        .map(([staffId, data]) => {
          const visits = data.clientVisits.size || 1;
          return {
            phorestStaffId: staffId,
            staffName: staffNameMap[staffId] || 'Unknown',
            avgTicket: visits > 0 ? data.revenue / visits : 0,
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
          };
        })
        .sort((a, b) => b.avgTicket - a.avgTicket);
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000,
  });
}
