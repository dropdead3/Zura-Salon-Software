import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface ProductCategoryData {
  category: string;
  totalRevenue: number;
  totalQuantity: number;
  avgPrice: number;
  itemCount: number;
}

export interface ServicePopularityData {
  name: string;
  category: string | null;
  frequency: number;
  totalRevenue: number;
  avgPrice: number;
}

export interface ClientFunnelData {
  newClientRevenue: number;
  returningClientRevenue: number;
  newClientCount: number;
  returningClientCount: number;
  newClientAvgTicket: number;
  returningClientAvgTicket: number;
}

export interface PeakHoursData {
  hour: number;
  dayOfWeek: number;
  transactionCount: number;
  revenue: number;
}

// Product category breakdown
export function useProductCategoryBreakdown(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['product-category-breakdown', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_sales_transactions')
          .select('item_category, total_amount, quantity, unit_price')
          .eq('item_type', 'product')
          .range(from, to);
        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Aggregate by category
      const byCategory: Record<string, ProductCategoryData> = {};
      data.forEach(row => {
        const category = row.item_category || 'Uncategorized';
        if (!byCategory[category]) {
          byCategory[category] = {
            category,
            totalRevenue: 0,
            totalQuantity: 0,
            avgPrice: 0,
            itemCount: 0,
          };
        }
        byCategory[category].totalRevenue += Number(row.total_amount) || 0;
        byCategory[category].totalQuantity += Number(row.quantity) || 1;
        byCategory[category].itemCount += 1;
      });

      // Calculate averages
      Object.values(byCategory).forEach(cat => {
        cat.avgPrice = cat.totalQuantity > 0 ? cat.totalRevenue / cat.totalQuantity : 0;
      });

      return Object.values(byCategory).sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

// Service popularity analysis - uses phorest_appointments for service data
export function useServicePopularity(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['service-popularity', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('service_name, total_price, tip_amount, location_id')
          .not('service_name', 'is', null)
          .not('total_price', 'is', null)
          .range(from, to);
        if (dateFrom) q = q.gte('appointment_date', dateFrom);
        if (dateTo) q = q.lte('appointment_date', dateTo);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Fetch service→category mapping from phorest_services
      const { data: services } = await supabase
        .from('v_all_services' as any)
        .select('name, category');
      
      const categoryMap: Record<string, string> = {};
      services?.forEach(s => {
        if (s.name && s.category) categoryMap[s.name] = s.category;
      });

      // Aggregate by service name
      const byService: Record<string, ServicePopularityData> = {};
      data.forEach(row => {
        const name = row.service_name;
        if (!name) return;
        if (!byService[name]) {
          byService[name] = {
            name,
            category: categoryMap[name] || null,
            frequency: 0,
            totalRevenue: 0,
            avgPrice: 0,
          };
        }
        byService[name].frequency += 1;
        // Use tip-adjusted price for accurate service revenue
        byService[name].totalRevenue += (Number(row.total_price) || 0) - (Number(row.tip_amount) || 0);
      });

      // Calculate averages
      Object.values(byService).forEach(svc => {
        svc.avgPrice = svc.frequency > 0 ? svc.totalRevenue / svc.frequency : 0;
      });

      return Object.values(byService).sort((a, b) => b.frequency - a.frequency);
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

// Client acquisition funnel (new vs returning)
export function useClientFunnel(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['client-funnel', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_sales_transactions')
          .select('client_name, total_amount, phorest_transaction_id')
          .range(from, to);
        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Get unique clients and their first transaction date
      const clientFirstDate: Record<string, string> = {};
      const allClients = await fetchAllBatched<any>((from, to) =>
        supabase
          .from('v_all_sales_transactions')
          .select('client_name, transaction_date')
          .not('client_name', 'is', null)
          .order('transaction_date', { ascending: true })
          .range(from, to)
      );

      allClients.forEach(row => {
        if (row.client_name && !clientFirstDate[row.client_name]) {
          clientFirstDate[row.client_name] = row.transaction_date;
        }
      });

      // Categorize transactions
      let newClientRevenue = 0;
      let returningClientRevenue = 0;
      const newClients = new Set<string>();
      const returningClients = new Set<string>();

      data.forEach(row => {
        if (!row.client_name) return;
        
        const firstDate = clientFirstDate[row.client_name];
        const isNew = firstDate && firstDate >= (dateFrom || '');
        
        if (isNew) {
          newClientRevenue += Number(row.total_amount) || 0;
          newClients.add(row.client_name);
        } else {
          returningClientRevenue += Number(row.total_amount) || 0;
          returningClients.add(row.client_name);
        }
      });

      const result: ClientFunnelData = {
        newClientRevenue,
        returningClientRevenue,
        newClientCount: newClients.size,
        returningClientCount: returningClients.size,
        newClientAvgTicket: newClients.size > 0 ? newClientRevenue / newClients.size : 0,
        returningClientAvgTicket: returningClients.size > 0 ? returningClientRevenue / returningClients.size : 0,
      };

      return result;
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

// Peak hours analysis
export function usePeakHoursAnalysis(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['peak-hours', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_sales_transactions')
          .select('transaction_date, transaction_time, total_amount, phorest_transaction_id')
          .range(from, to);
        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Aggregate by hour and day of week
      const heatmap: Record<string, PeakHoursData> = {};
      
      data.forEach(row => {
        if (!row.transaction_time || !row.transaction_date) return;
        
        const hour = parseInt(row.transaction_time.split(':')[0]);
        const date = new Date(row.transaction_date);
        const dayOfWeek = date.getDay(); // 0 = Sunday
        
        const key = `${dayOfWeek}-${hour}`;
        if (!heatmap[key]) {
          heatmap[key] = {
            hour,
            dayOfWeek,
            transactionCount: 0,
            revenue: 0,
          };
        }
        heatmap[key].transactionCount += 1;
        heatmap[key].revenue += Number(row.total_amount) || 0;
      });

      return Object.values(heatmap);
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
