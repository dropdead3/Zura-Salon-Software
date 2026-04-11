import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { isAllLocations, parseLocationIds } from '@/lib/locationFilter';
import { isVishServiceCharge } from '@/utils/serviceCategorization';

export interface ProductLineItem {
  itemName: string;
  amount: number;
}

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
  productItems: ProductLineItem[];
}

interface UseServiceProductDrilldownOptions {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

/** Fetch all rows from a query, paginating in batches of 1000 to avoid Supabase default limit. */
async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => any,
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let offset = 0;
  let done = false;
  while (!done) {
    const { data, error } = await buildQuery(offset, offset + PAGE - 1);
    if (error) throw error;
    if (data) all.push(...(data as T[]));
    if (!data || data.length < PAGE) done = true;
    offset += PAGE;
  }
  return all;
}

export function useServiceProductDrilldown({ dateFrom, dateTo, locationId }: UseServiceProductDrilldownOptions) {
  return useQuery({
    queryKey: ['service-product-drilldown', dateFrom, dateTo, locationId || 'all'],
    queryFn: async () => {
      // Normalize date bounds for transaction_date (may be timestamp)
      const txDateFrom = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00`;
      const txDateTo = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59.999`;

      // --- Fetch appointments (paginated) ---
      const appointments = await fetchAllPages<{
        phorest_staff_id: string | null;
        total_price: number | null;
        tip_amount: number | null;
        service_name: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('phorest_staff_id, total_price, tip_amount, service_name')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('status', 'in', '("cancelled","no_show","Cancelled","No Show")')
          .not('total_price', 'is', null)
          .range(from, to);
        if (!isAllLocations(locationId)) {
          const ids = parseLocationIds(locationId);
          q = ids.length === 1 ? q.eq('location_id', ids[0]) : q.in('location_id', ids);
        }
        return q;
      });

      // --- Fetch product transaction items (paginated) ---
      const productItems = await fetchAllPages<{
        phorest_staff_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        item_name: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('phorest_staff_id, total_amount, tax_amount, item_name')
          .gte('transaction_date', txDateFrom)
          .lte('transaction_date', txDateTo)
          .in('item_type', ['product', 'Product', 'retail', 'Retail', 'PRODUCT', 'RETAIL'])
          .range(from, to);
        if (!isAllLocations(locationId)) {
          const ids = parseLocationIds(locationId);
          q = ids.length === 1 ? q.eq('location_id', ids[0]) : q.in('location_id', ids);
        }
        return q;
      });


      // --- Staff name lookup ---
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
        staffLookup[m.phorest_staff_id] = profile ? formatDisplayName(profile.full_name || '', profile.display_name) : 'Unknown';
      });

      // --- Aggregate services by staff ---
      const serviceMap: Record<string, { serviceRevenue: number; serviceCount: number; tipTotal: number }> = {};
      appointments.forEach(appt => {
        const sid = appt.phorest_staff_id;
        if (!sid) return;
        if (!serviceMap[sid]) serviceMap[sid] = { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        serviceMap[sid].serviceRevenue += (Number(appt.total_price) || 0) - (Number(appt.tip_amount) || 0);
        serviceMap[sid].serviceCount += 1;
        serviceMap[sid].tipTotal += Number(appt.tip_amount) || 0;
      });

      // --- Aggregate products by staff (tax-inclusive) ---
      const productMap: Record<string, { productRevenue: number; productCount: number; items: ProductLineItem[] }> = {};
      productItems.forEach(item => {
        const sid = item.phorest_staff_id;
        if (!sid) return;
        if (isVishServiceCharge(item.item_name, 'product')) return;
        if (!productMap[sid]) productMap[sid] = { productRevenue: 0, productCount: 0, items: [] };
        const amt = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        productMap[sid].productRevenue += amt;
        productMap[sid].productCount += 1;
        productMap[sid].items.push({ itemName: item.item_name || 'Unknown Product', amount: amt });
      });

      // --- Merge ---
      const allStaffIds = new Set([...Object.keys(serviceMap), ...Object.keys(productMap)]);
      let totalServiceRevenue = 0;
      let totalProductRevenue = 0;
      Object.values(serviceMap).forEach(v => { totalServiceRevenue += v.serviceRevenue; });
      Object.values(productMap).forEach(v => { totalProductRevenue += v.productRevenue; });

      const staffData: StaffServiceProduct[] = Array.from(allStaffIds).map(phorestStaffId => {
        const svc = serviceMap[phorestStaffId] || { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        const prod = productMap[phorestStaffId] || { productRevenue: 0, productCount: 0, items: [] };
        const sortedItems = [...prod.items].sort((a, b) => b.amount - a.amount);
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
          productItems: sortedItems,
        };
      });

      return { staffData, totalServiceRevenue, totalProductRevenue };
    },
    staleTime: 2 * 60 * 1000,
  });
}
