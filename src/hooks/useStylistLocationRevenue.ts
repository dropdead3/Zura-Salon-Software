import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subWeeks, startOfWeek } from 'date-fns';

export interface LocationRevenueData {
  locationId: string | null;
  branchName: string;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalTransactions: number;
  totalServices: number;
  totalProducts: number;
  averageTicket: number;
}

export interface LocationTrendData {
  weekLabel: string;
  [locationKey: string]: string | number;
}

/**
 * Fetches revenue breakdown by location for a specific stylist (from live POS transaction items)
 */
export function useStylistLocationRevenue(userId: string | undefined, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['stylist-location-revenue', userId, dateFrom, dateTo],
    queryFn: async () => {
      if (!userId) return [];

      const { data: locations } = await supabase
        .from('locations')
        .select('id, name');

      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let q: any = supabase
          .from('phorest_transaction_items')
          .select('location_id, total_amount, tax_amount, item_type')
          .eq('stylist_user_id', userId);
        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        const { data, error } = await q.range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      const byLocation: Record<string, LocationRevenueData> = {};
      for (const item of allData) {
        const key = item.location_id || 'Unknown';
        if (!byLocation[key]) {
          const loc = locations?.find(l => l.id === item.location_id);
          byLocation[key] = {
            locationId: item.location_id,
            branchName: loc?.name || 'Unknown',
            totalRevenue: 0, serviceRevenue: 0, productRevenue: 0,
            totalTransactions: 0, totalServices: 0, totalProducts: 0, averageTicket: 0,
          };
        }
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        byLocation[key].totalRevenue += amount;
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') {
          byLocation[key].serviceRevenue += amount;
          byLocation[key].totalServices += 1;
        } else {
          byLocation[key].productRevenue += amount;
          byLocation[key].totalProducts += 1;
        }
        byLocation[key].totalTransactions += 1;
      }

      Object.values(byLocation).forEach(loc => {
        loc.averageTicket = loc.totalTransactions > 0 ? loc.totalRevenue / loc.totalTransactions : 0;
      });

      return Object.values(byLocation).sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
    enabled: !!userId,
  });
}

/**
 * Fetches weekly revenue trend by location for a specific stylist (from live POS transaction items)
 */
export function useStylistLocationTrend(userId: string | undefined, weeks: number = 8) {
  return useQuery({
    queryKey: ['stylist-location-trend', userId, weeks],
    queryFn: async () => {
      if (!userId) return { weeklyData: [], locations: [] };

      const today = new Date();
      const weekRanges: { start: string; end: string; label: string }[] = [];
      
      for (let i = weeks - 1; i >= 0; i--) {
        const weekDate = subWeeks(today, i);
        const start = startOfWeek(weekDate, { weekStartsOn: 1 });
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        weekRanges.push({
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
          label: format(start, 'MMM d'),
        });
      }

      const { data: locations } = await supabase
        .from('locations')
        .select('id, name');

      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_transaction_items')
          .select('transaction_date, location_id, total_amount, tax_amount')
          .eq('stylist_user_id', userId)
          .gte('transaction_date', weekRanges[0].start)
          .lte('transaction_date', weekRanges[weekRanges.length - 1].end)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      const locationNames: Record<string, string> = {};
      for (const item of allData) {
        const key = item.location_id || 'Unknown';
        if (!locationNames[key]) {
          const loc = locations?.find(l => l.id === item.location_id);
          locationNames[key] = loc?.name || 'Unknown';
        }
      }

      const weeklyData: LocationTrendData[] = weekRanges.map(range => {
        const weekItems = allData.filter(item => {
          const date = (item.transaction_date || '').slice(0, 10);
          return date >= range.start && date <= range.end;
        });
        
        const dataPoint: LocationTrendData = { weekLabel: range.label };
        Object.entries(locationNames).forEach(([, name]) => {
          dataPoint[name] = 0;
        });

        for (const item of weekItems) {
          const locKey = item.location_id || 'Unknown';
          const locName = locationNames[locKey];
          if (locName) {
            dataPoint[locName] = (dataPoint[locName] as number || 0) + (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
          }
        }

        return dataPoint;
      });

      return {
        weeklyData,
        locations: Object.values(locationNames),
      };
    },
    enabled: !!userId,
  });
}
