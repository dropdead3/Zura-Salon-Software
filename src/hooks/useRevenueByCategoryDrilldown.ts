import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory, isVishServiceCharge } from '@/utils/serviceCategorization';
import { resolveStaffWithPhotosByPhorestIds } from '@/utils/resolveStaffNames';

export interface CategoryStylistData {
  phorestStaffId: string;
  staffName: string;
  photoUrl?: string | null;
  revenue: number;
  count: number;
  sharePercent: number;
  serviceDetails?: { serviceName: string; amount: number }[];
  items?: { itemName: string; amount: number; date: string }[];
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
          .from('v_all_transaction_items')
          .select('item_name, item_type, total_amount, tax_amount, staff_user_id, phorest_client_id, transaction_date, transaction_id')
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


      // Get staff name mappings via centralized resolver
      const staffIds = [...new Set(allItems.map(a => a.staff_user_id).filter(Boolean))];
      const staffInfoMap = await resolveStaffWithPhotosByPhorestIds(staffIds);

      // Aggregate by category → stylist
      const categoryMap: Record<string, {
        revenue: number;
        count: number;
        stylists: Record<string, {
          revenue: number;
          count: number;
          vishTransactionAmounts: { transactionId: string; amount: number }[];
          items: { itemName: string; amount: number; date: string }[];
        }>;
      }> = {};

      let totalRevenue = 0;

      // Track Vish transaction IDs for service name resolution
      const vishTransactionIds = new Set<string>();

      allItems.forEach(item => {
        const itemType = (item.item_type || '').toLowerCase();
        const itemName = item.item_name || '';
        const isVish = isVishServiceCharge(itemName, itemType) || (itemType === 'sale_fee' && /\bvish\b/i.test(itemName));
        const category = isVish
          ? 'Chemical Overage Fees'
          : itemType === 'service'
            ? getServiceCategory(itemName)
            : (itemType === 'product' ? 'Retail' : 'Other');
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const staffId = item.staff_user_id || 'unknown';



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
            vishTransactionAmounts: [],
            items: [],
          };
        }
        const s = categoryMap[category].stylists[staffId];
        s.revenue += amount;
        s.count += 1;
        s.items.push({ itemName, amount, date: item.transaction_date || '' });

        // Track Vish transaction IDs for service name lookup
        if (isVish && item.transaction_id) {
          vishTransactionIds.add(item.transaction_id);
          s.vishTransactionAmounts.push({ transactionId: item.transaction_id, amount });
        }
      });

      // Batch-fetch service names for Vish transactions
      const txServiceMap = new Map<string, string>();
      if (vishTransactionIds.size > 0) {
        const txIds = [...vishTransactionIds];
        // Batch in chunks of 100 for the IN filter
        for (let i = 0; i < txIds.length; i += 100) {
          const batch = txIds.slice(i, i + 100);
          const { data: svcItems } = await supabase
            .from('v_all_transaction_items')
            .select('transaction_id, item_name')
            .in('transaction_id', batch)
            .eq('item_type', 'service');
          (svcItems || []).forEach((si: any) => {
            // Take first service name per transaction
            if (!txServiceMap.has(si.transaction_id)) {
              txServiceMap.set(si.transaction_id, si.item_name);
            }
          });
        }
      }

      // Populate serviceDetails on Chemical Overage Fees stylists
      const overageData = categoryMap['Chemical Overage Fees'];
      if (overageData) {
        Object.values(overageData.stylists).forEach(s => {
          // Build serviceDetails from vishTransactionAmounts
          const detailMap = new Map<string, number>();
          s.vishTransactionAmounts.forEach(({ transactionId, amount }) => {
            const svcName = txServiceMap.get(transactionId) || 'Unknown Service';
            detailMap.set(svcName, (detailMap.get(svcName) || 0) + amount);
          });
          (s as any).serviceDetails = [...detailMap.entries()].map(([serviceName, amt]) => ({
            serviceName,
            amount: amt,
          })).sort((a, b) => b.amount - a.amount);
        });
      }

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
              staffName: staffInfoMap[staffId]?.name || 'Unknown',
              photoUrl: staffInfoMap[staffId]?.photoUrl || null,
              revenue: s.revenue,
              count: s.count,
              sharePercent: data.revenue > 0 ? Math.round((s.revenue / data.revenue) * 100) : 0,
              serviceDetails: (s as any).serviceDetails as { serviceName: string; amount: number }[] | undefined,
              items: s.items.sort((a, b) => b.date.localeCompare(a.date)),
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
