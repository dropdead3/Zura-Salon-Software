import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getServiceCategory } from '@/utils/serviceCategorization';

export interface ServiceCostProfitRow {
  locationId: string | null;
  locationName: string;
  serviceCategory: string;
  serviceName: string;
  totalServices: number;
  totalSales: number;
  costPerService: number;
  totalCost: number;
  profit: number;
  profitPct: number;
  hasCostDefined: boolean;
}

export interface ServiceCostsProfitsData {
  rows: ServiceCostProfitRow[];
  totals: {
    totalServices: number;
    totalSales: number;
    totalCost: number;
    profit: number;
    profitPct: number;
  };
}

async function fetchAllAppointments(dateFrom: string, dateTo: string, locationId?: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('phorest_appointments')
      .select('service_name, service_category, total_price, location_id')
      .gte('appointment_date', dateFrom)
      .lte('appointment_date', dateTo)
      .not('service_name', 'is', null)
      .range(from, from + PAGE_SIZE - 1);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;
    if (error) throw error;
    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allData;
}

export function useServiceCostsProfits(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['service-costs-profits', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // Fetch appointments and service costs in parallel
      const [appointments, servicesResult, locationsResult] = await Promise.all([
        fetchAllAppointments(dateFrom, dateTo, locationId),
        supabase.from('services').select('name, cost, category').eq('is_active', true),
        supabase.from('locations').select('id, name'),
      ]);

      if (servicesResult.error) throw servicesResult.error;
      if (locationsResult.error) throw locationsResult.error;

      // Build cost lookup by service name
      const costMap = new Map<string, number>();
      for (const s of servicesResult.data || []) {
        if (s.cost != null) costMap.set(s.name, s.cost);
      }

      // Build location name lookup
      const locationMap = new Map<string, string>();
      for (const loc of locationsResult.data || []) {
        locationMap.set(loc.id, loc.name);
      }

      // Group by location + category + service
      const grouped = new Map<string, {
        locationId: string | null;
        locationName: string;
        serviceCategory: string;
        serviceName: string;
        count: number;
        sales: number;
      }>();

      for (const appt of appointments) {
        const key = `${appt.location_id || 'all'}|${appt.service_category || 'Other'}|${appt.service_name}`;
        const existing = grouped.get(key) || {
          locationId: appt.location_id,
          locationName: appt.location_id ? (locationMap.get(appt.location_id) || 'Unknown') : 'All',
          serviceCategory: getServiceCategory(appt.service_name),
          serviceName: appt.service_name!,
          count: 0,
          sales: 0,
        };
        existing.count += 1;
        existing.sales += (appt.total_price || 0);
        grouped.set(key, existing);
      }

      // Calculate profits
      const rows: ServiceCostProfitRow[] = [];
      for (const g of grouped.values()) {
        const hasCostDefined = costMap.has(g.serviceName);
        const costPerService = costMap.get(g.serviceName) || 0;
        const totalCost = costPerService * g.count;
        const profit = g.sales - totalCost;
        const profitPct = g.sales > 0 ? (profit / g.sales) * 100 : 0;

        rows.push({
          locationId: g.locationId,
          locationName: g.locationName,
          serviceCategory: g.serviceCategory,
          serviceName: g.serviceName,
          totalServices: g.count,
          totalSales: g.sales,
          costPerService,
          totalCost,
          profit,
          profitPct,
          hasCostDefined,
        });
      }

      // Sort by total sales descending
      rows.sort((a, b) => b.totalSales - a.totalSales);

      // Calculate totals
      const totalServices = rows.reduce((s, r) => s + r.totalServices, 0);
      const totalSales = rows.reduce((s, r) => s + r.totalSales, 0);
      const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
      const totalProfit = totalSales - totalCost;
      const totalProfitPct = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      return {
        rows,
        totals: {
          totalServices,
          totalSales,
          totalCost,
          profit: totalProfit,
          profitPct: totalProfitPct,
        },
      } as ServiceCostsProfitsData;
    },
  });
}
