import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffServiceProduct {
  phorestStaffId: string;
  staffName: string;
  serviceRevenue: number;
  serviceCount: number;
  productRevenue: number;
  productCount: number;
  retailToServiceRatio: number;
  sharePercent: number;
  tipTotal: number;
}

interface UseServiceProductDrilldownOptions {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function useServiceProductDrilldown({ dateFrom, dateTo, locationId }: UseServiceProductDrilldownOptions) {
  return useQuery({
    queryKey: ['service-product-drilldown', dateFrom, dateTo, locationId || 'all'],
    queryFn: async () => {
      // Query phorest_appointments for service data
      let query = supabase
        .from('phorest_appointments')
        .select('phorest_staff_id, total_price, tip_amount, service_name')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show","Cancelled","No Show")')
        .not('total_price', 'is', null);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      // Query product data from transaction items
      let productQuery = supabase
        .from('phorest_transaction_items')
        .select('phorest_staff_id, total_amount, tax_amount, item_name')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .in('item_type', ['product', 'Product', 'retail', 'Retail', 'PRODUCT', 'RETAIL']);

      if (locationId && locationId !== 'all') {
        productQuery = productQuery.eq('location_id', locationId);
      }

      const { data: productItems, error: productError } = await productQuery;
      if (productError) throw productError;

      // Fetch staff name mappings
      const { data: staffMappings } = await supabase
        .from('phorest_staff_mapping')
        .select(`
          phorest_staff_id,
          user_id,
          employee_profiles:user_id (
            full_name,
            display_name
          )
        `)
        .eq('is_active', true);

      const staffLookup: Record<string, string> = {};
      staffMappings?.forEach(m => {
        const profile = m.employee_profiles as any;
        staffLookup[m.phorest_staff_id] = profile?.display_name || profile?.full_name || 'Unknown';
      });

      // Aggregate services by staff
      const serviceMap: Record<string, { serviceRevenue: number; serviceCount: number; tipTotal: number }> = {};
      (appointments || []).forEach(appt => {
        const sid = appt.phorest_staff_id;
        if (!sid) return;
        if (!serviceMap[sid]) {
          serviceMap[sid] = { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        }
        serviceMap[sid].serviceRevenue += Number(appt.total_price) || 0;
        serviceMap[sid].serviceCount += 1;
        serviceMap[sid].tipTotal += Number(appt.tip_amount) || 0;
      });

      // Aggregate products by staff (tax-inclusive)
      const productMap: Record<string, { productRevenue: number; productCount: number }> = {};
      (productItems || []).forEach(item => {
        const sid = item.phorest_staff_id;
        if (!sid) return;
        if (!productMap[sid]) {
          productMap[sid] = { productRevenue: 0, productCount: 0 };
        }
        productMap[sid].productRevenue += (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        productMap[sid].productCount += 1;
      });

      // Merge staff IDs from both sources
      const allStaffIds = new Set([...Object.keys(serviceMap), ...Object.keys(productMap)]);

      let totalServiceRevenue = 0;
      let totalProductRevenue = 0;
      Object.values(serviceMap).forEach(v => { totalServiceRevenue += v.serviceRevenue; });
      Object.values(productMap).forEach(v => { totalProductRevenue += v.productRevenue; });

      const staffData: StaffServiceProduct[] = Array.from(allStaffIds).map(phorestStaffId => {
        const svc = serviceMap[phorestStaffId] || { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        const prod = productMap[phorestStaffId] || { productRevenue: 0, productCount: 0 };
        return {
          phorestStaffId,
          staffName: staffLookup[phorestStaffId] || 'Unknown',
          serviceRevenue: svc.serviceRevenue,
          serviceCount: svc.serviceCount,
          productRevenue: prod.productRevenue,
          productCount: prod.productCount,
          retailToServiceRatio: svc.serviceRevenue > 0 ? prod.productRevenue / svc.serviceRevenue : 0,
          sharePercent: totalProductRevenue > 0 ? (prod.productRevenue / totalProductRevenue) * 100 : 0,
          tipTotal: svc.tipTotal,
        };
      });

      return {
        staffData,
        totalServiceRevenue,
        totalProductRevenue,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
