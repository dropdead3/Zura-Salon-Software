import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subYears, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export type CompareMode = 'time' | 'location' | 'category' | 'yoy';

export interface PeriodData {
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalTransactions: number;
  averageTicket: number;
}

export interface PercentChanges {
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalTransactions: number;
  averageTicket: number;
}

export interface LocationBreakdown {
  locationId: string;
  name: string;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalTransactions: number;
  share: number;
}

export interface CategoryBreakdown {
  category: string;
  periodA: number;
  periodB: number;
  change: number;
  changePercent: number;
}

export interface WaterfallItem {
  category: string;
  delta: number;
  isIncrease: boolean;
}

export interface DailyOverlayPoint {
  date: string;
  periodA: number;
  periodB: number;
  delta: number;
}

export interface ComparisonResult {
  periodA: PeriodData;
  periodB: PeriodData;
  changes: PercentChanges;
  difference: {
    revenue: number;
    services: number;
    products: number;
    transactions: number;
    avgTicket: number;
  };
  locationBreakdown?: LocationBreakdown[];
  categoryBreakdown?: CategoryBreakdown[];
  waterfall?: WaterfallItem[];
  dailyOverlay?: DailyOverlayPoint[];
}

interface ComparisonParams {
  mode: CompareMode;
  periodA: { dateFrom: string; dateTo: string };
  periodB: { dateFrom: string; dateTo: string };
  locationIds?: string[];
}

// Calculate percent change
const calcChange = (curr: number, prev: number) =>
  prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

// Aggregate sales data from array
const aggregateSales = (data: any[]): Omit<PeriodData, 'averageTicket'> => {
  return (data || []).reduce(
    (acc, d) => ({
      totalRevenue: acc.totalRevenue + (Number(d.total_revenue) || 0),
      serviceRevenue: acc.serviceRevenue + (Number(d.service_revenue) || 0),
      productRevenue: acc.productRevenue + (Number(d.product_revenue) || 0),
      totalTransactions: acc.totalTransactions + (d.total_transactions || 0),
    }),
    { totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, totalTransactions: 0 }
  );
};

export function useComparisonData(params: ComparisonParams) {
  const { mode, periodA, periodB, locationIds } = params;

  return useQuery({
    queryKey: ['comparison-data', mode, periodA, periodB, locationIds],
    queryFn: async (): Promise<ComparisonResult> => {
      // Helper to fetch period data from transaction items
      const fetchPeriod = async (dateFrom: string, dateTo: string) => {
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          let q: any = supabase
            .from('phorest_transaction_items')
            .select('transaction_date, total_amount, tax_amount, item_type, location_id, phorest_client_id')
            .gte('transaction_date', dateFrom)
            .lte('transaction_date', dateTo);
          if (locationIds && locationIds.length > 0) q = q.in('location_id', locationIds);
          const { data, error } = await q.range(from, from + pageSize - 1);
          if (error) throw error;
          allData.push(...(data || []));
          hasMore = (data?.length || 0) === pageSize;
          from += pageSize;
        }
        // Aggregate to daily summary-like rows
        const byDate: Record<string, any> = {};
        for (const item of allData) {
          const date = (item.transaction_date || '').slice(0, 10);
          if (!byDate[date]) byDate[date] = { summary_date: date, total_revenue: 0, service_revenue: 0, product_revenue: 0, total_transactions: 0, location_id: item.location_id };
          const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
          byDate[date].total_revenue += amount;
          if (item.item_type === 'service') byDate[date].service_revenue += amount;
          else byDate[date].product_revenue += amount;
          byDate[date].total_transactions += 1;
        }
        return Object.values(byDate).sort((a: any, b: any) => a.summary_date.localeCompare(b.summary_date));
      };

      const dataA = await fetchPeriod(periodA.dateFrom, periodA.dateTo);
      const dataB = await fetchPeriod(periodB.dateFrom, periodB.dateTo);

      // Aggregate totals
      const aggregatedA = aggregateSales(dataA);
      const aggregatedB = aggregateSales(dataB);

      const avgTicketA = aggregatedA.totalTransactions > 0
        ? aggregatedA.totalRevenue / aggregatedA.totalTransactions
        : 0;
      const avgTicketB = aggregatedB.totalTransactions > 0
        ? aggregatedB.totalRevenue / aggregatedB.totalTransactions
        : 0;

      const result: ComparisonResult = {
        periodA: { ...aggregatedA, averageTicket: avgTicketA },
        periodB: { ...aggregatedB, averageTicket: avgTicketB },
        changes: {
          totalRevenue: calcChange(aggregatedA.totalRevenue, aggregatedB.totalRevenue),
          serviceRevenue: calcChange(aggregatedA.serviceRevenue, aggregatedB.serviceRevenue),
          productRevenue: calcChange(aggregatedA.productRevenue, aggregatedB.productRevenue),
          totalTransactions: calcChange(aggregatedA.totalTransactions, aggregatedB.totalTransactions),
          averageTicket: calcChange(avgTicketA, avgTicketB),
        },
        difference: {
          revenue: aggregatedA.totalRevenue - aggregatedB.totalRevenue,
          services: aggregatedA.serviceRevenue - aggregatedB.serviceRevenue,
          products: aggregatedA.productRevenue - aggregatedB.productRevenue,
          transactions: aggregatedA.totalTransactions - aggregatedB.totalTransactions,
          avgTicket: avgTicketA - avgTicketB,
        },
        // Add waterfall data
        waterfall: [
          { 
            category: 'Services', 
            delta: aggregatedA.serviceRevenue - aggregatedB.serviceRevenue, 
            isIncrease: aggregatedA.serviceRevenue >= aggregatedB.serviceRevenue 
          },
          { 
            category: 'Products', 
            delta: aggregatedA.productRevenue - aggregatedB.productRevenue, 
            isIncrease: aggregatedA.productRevenue >= aggregatedB.productRevenue 
          },
        ],
      };

      // Daily overlay for time/yoy modes
      if (mode === 'time' || mode === 'yoy') {
        // Aggregate by date for each period
        const dailyMapA: Record<string, number> = {};
        const dailyMapB: Record<string, number> = {};

        (dataA || []).forEach(row => {
          const d = row.summary_date;
          dailyMapA[d] = (dailyMapA[d] || 0) + (Number(row.total_revenue) || 0);
        });
        (dataB || []).forEach(row => {
          const d = row.summary_date;
          dailyMapB[d] = (dailyMapB[d] || 0) + (Number(row.total_revenue) || 0);
        });

        const daysA = Object.keys(dailyMapA).sort();
        const daysB = Object.keys(dailyMapB).sort();
        const maxLen = Math.max(daysA.length, daysB.length);

        const overlay: DailyOverlayPoint[] = [];
        for (let i = 0; i < maxLen; i++) {
          const valA = i < daysA.length ? dailyMapA[daysA[i]] : 0;
          const valB = i < daysB.length ? dailyMapB[daysB[i]] : 0;
          overlay.push({
            date: i < daysA.length ? daysA[i] : daysB[i],
            periodA: valA,
            periodB: valB,
            delta: valA - valB,
          });
        }
        result.dailyOverlay = overlay;
      }

      // Location breakdown for location mode
      if (mode === 'location') {
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name');

        const locationMap = new Map(locations?.map(l => [l.id, l.name]) || []);
        const byLocation: Record<string, LocationBreakdown> = {};

        (dataA || []).forEach(row => {
          const locId = row.location_id || 'unknown';
          if (!byLocation[locId]) {
            byLocation[locId] = {
              locationId: locId,
              name: locationMap.get(locId) || 'Unknown Location',
              totalRevenue: 0,
              serviceRevenue: 0,
              productRevenue: 0,
              totalTransactions: 0,
              share: 0,
            };
          }
          byLocation[locId].totalRevenue += Number(row.total_revenue) || 0;
          byLocation[locId].serviceRevenue += Number(row.service_revenue) || 0;
          byLocation[locId].productRevenue += Number(row.product_revenue) || 0;
          byLocation[locId].totalTransactions += row.total_transactions || 0;
        });

        // Calculate shares
        const totalRevenue = Object.values(byLocation).reduce((sum, l) => sum + l.totalRevenue, 0);
        Object.values(byLocation).forEach(l => {
          l.share = totalRevenue > 0 ? (l.totalRevenue / totalRevenue) * 100 : 0;
        });

        result.locationBreakdown = Object.values(byLocation).sort((a, b) => b.totalRevenue - a.totalRevenue);
      }

      // Category breakdown for category mode
      if (mode === 'category') {
        // Fetch category data for both periods with pagination
        const [catDataA, catDataB] = await Promise.all([
          fetchAllBatched<any>((from, to) =>
            supabase
              .from('phorest_sales_transactions')
              .select('item_category, total_amount')
              .gte('transaction_date', periodA.dateFrom)
              .lte('transaction_date', periodA.dateTo)
              .range(from, to)
          ),
          fetchAllBatched<any>((from, to) =>
            supabase
              .from('phorest_sales_transactions')
              .select('item_category, total_amount')
              .gte('transaction_date', periodB.dateFrom)
              .lte('transaction_date', periodB.dateTo)
              .range(from, to)
          ),
        ]);

        // Aggregate by category for both periods
        const catAggA: Record<string, number> = {};
        const catAggB: Record<string, number> = {};

        catDataA.forEach(row => {
          const cat = row.item_category || 'Uncategorized';
          catAggA[cat] = (catAggA[cat] || 0) + (Number(row.total_amount) || 0);
        });

        catDataB.forEach(row => {
          const cat = row.item_category || 'Uncategorized';
          catAggB[cat] = (catAggB[cat] || 0) + (Number(row.total_amount) || 0);
        });

        // Combine categories
        const allCategories = new Set([...Object.keys(catAggA), ...Object.keys(catAggB)]);
        const categoryBreakdown: CategoryBreakdown[] = [];

        allCategories.forEach(cat => {
          const a = catAggA[cat] || 0;
          const b = catAggB[cat] || 0;
          categoryBreakdown.push({
            category: cat,
            periodA: a,
            periodB: b,
            change: a - b,
            changePercent: calcChange(a, b),
          });
        });

        result.categoryBreakdown = categoryBreakdown.sort((a, b) => b.periodA - a.periodA);
      }

      return result;
    },
    enabled: !!periodA.dateFrom && !!periodA.dateTo && !!periodB.dateFrom && !!periodB.dateTo,
  });
}

// Helper to get preset date ranges
export function getPresetPeriods(preset: string): { periodA: { dateFrom: string; dateTo: string }; periodB: { dateFrom: string; dateTo: string } } {
  const today = new Date();
  
  switch (preset) {
    case 'thisMonth-lastMonth': {
      const thisMonthStart = startOfMonth(today);
      const thisMonthEnd = endOfMonth(today);
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const lastMonthEnd = endOfMonth(subMonths(today, 1));
      return {
        periodA: { dateFrom: format(thisMonthStart, 'yyyy-MM-dd'), dateTo: format(thisMonthEnd, 'yyyy-MM-dd') },
        periodB: { dateFrom: format(lastMonthStart, 'yyyy-MM-dd'), dateTo: format(lastMonthEnd, 'yyyy-MM-dd') },
      };
    }
    case 'thisWeek-lastWeek': {
      const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      const thisWeekEnd = endOfWeek(today, { weekStartsOn: 0 });
      const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      return {
        periodA: { dateFrom: format(thisWeekStart, 'yyyy-MM-dd'), dateTo: format(thisWeekEnd, 'yyyy-MM-dd') },
        periodB: { dateFrom: format(lastWeekStart, 'yyyy-MM-dd'), dateTo: format(lastWeekEnd, 'yyyy-MM-dd') },
      };
    }
    case 'thisYear-lastYear': {
      const thisYearStart = startOfYear(today);
      const thisYearEnd = endOfYear(today);
      const lastYearStart = startOfYear(subYears(today, 1));
      const lastYearEnd = endOfYear(subYears(today, 1));
      return {
        periodA: { dateFrom: format(thisYearStart, 'yyyy-MM-dd'), dateTo: format(thisYearEnd, 'yyyy-MM-dd') },
        periodB: { dateFrom: format(lastYearStart, 'yyyy-MM-dd'), dateTo: format(lastYearEnd, 'yyyy-MM-dd') },
      };
    }
    case 'q1-q1LastYear': {
      const q1Start = new Date(today.getFullYear(), 0, 1);
      const q1End = new Date(today.getFullYear(), 2, 31);
      const q1LastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const q1LastYearEnd = new Date(today.getFullYear() - 1, 2, 31);
      return {
        periodA: { dateFrom: format(q1Start, 'yyyy-MM-dd'), dateTo: format(q1End, 'yyyy-MM-dd') },
        periodB: { dateFrom: format(q1LastYearStart, 'yyyy-MM-dd'), dateTo: format(q1LastYearEnd, 'yyyy-MM-dd') },
      };
    }
    default:
      return getPresetPeriods('thisMonth-lastMonth');
  }
}
