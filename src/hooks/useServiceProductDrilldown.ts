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

      // --- Fetch appointments (paginated) --- uses staff_name from view
      const appointments = await fetchAllPages<{
        phorest_staff_id: string | null;
        stylist_user_id: string | null;
        staff_name: string | null;
        total_price: number | null;
        tip_amount: number | null;
        service_name: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('staff_user_id, stylist_user_id, staff_name, total_price, tip_amount, service_name')
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

      // --- Fetch product transaction items (paginated) --- uses staff_user_id from view
      const productItems = await fetchAllPages<{
        staff_user_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        item_name: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('staff_user_id, total_amount, tax_amount, item_name')
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


      // --- Build staff lookup: resolve via employee_profiles (Zura-native) ---
      // Collect unique staff identifiers from appointments (prefer stylist_user_id)
      const staffIdSet = new Set<string>();
      appointments.forEach(appt => {
        const sid = appt.stylist_user_id || appt.phorest_staff_id;
        if (sid) staffIdSet.add(sid);
      });
      productItems.forEach(item => {
        const sid = (item as any).phorest_staff_id || item.staff_user_id;
        if (sid) staffIdSet.add(sid);
      });
      const allStaffIds = [...staffIdSet];

      // Try employee_profiles first
      const { data: profiles } = allStaffIds.length > 0
        ? await supabase
            .from('employee_profiles')
            .select('user_id, full_name, display_name')
            .in('user_id', allStaffIds)
        : { data: [] };

      const staffLookup: Record<string, string> = {};
      ((profiles || []) as any[]).forEach((p: any) => {
        staffLookup[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
      });

      // For unresolved phorest_staff_ids, try phorest_staff_mapping
      const unresolvedPhorestIds = allStaffIds.filter(id => !staffLookup[id]);
      if (unresolvedPhorestIds.length > 0) {
        const { data: mappings } = await supabase
          .from('v_all_staff' as any)
          .select(`phorest_staff_id, user_id, employee_profiles:user_id (full_name, display_name)`)
          .in('phorest_staff_id', unresolvedPhorestIds)
          .eq('is_active', true);
        mappings?.forEach((m: any) => {
          const profile = m.employee_profiles;
          staffLookup[m.phorest_staff_id] = profile ? formatDisplayName(profile.full_name || '', profile.display_name) : 'Unknown';
        });
      }

      // Also use staff_name from appointments as final fallback
      appointments.forEach(appt => {
        const sid = appt.stylist_user_id || appt.phorest_staff_id;
        if (sid && !staffLookup[sid] && appt.staff_name) {
          staffLookup[sid] = appt.staff_name;
        }
      });

      // --- Aggregate services by staff ---
      const serviceMap: Record<string, { serviceRevenue: number; serviceCount: number; tipTotal: number }> = {};
      appointments.forEach(appt => {
        const sid = appt.stylist_user_id || appt.phorest_staff_id;
        if (!sid) return;
        if (!serviceMap[sid]) serviceMap[sid] = { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        serviceMap[sid].serviceRevenue += (Number(appt.total_price) || 0) - (Number(appt.tip_amount) || 0);
        serviceMap[sid].serviceCount += 1;
        serviceMap[sid].tipTotal += Number(appt.tip_amount) || 0;
      });

      // --- Aggregate products by staff (tax-inclusive) ---
      const productMap: Record<string, { productRevenue: number; productCount: number; items: ProductLineItem[] }> = {};
      productItems.forEach(item => {
        const sid = (item as any).phorest_staff_id || item.staff_user_id;
        if (!sid) return;
        if (isVishServiceCharge(item.item_name, 'product')) return;
        if (!productMap[sid]) productMap[sid] = { productRevenue: 0, productCount: 0, items: [] };
        const amt = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        productMap[sid].productRevenue += amt;
        productMap[sid].productCount += 1;
        productMap[sid].items.push({ itemName: item.item_name || 'Unknown Product', amount: amt });
      });

      // --- Merge ---
      const mergedStaffIds = new Set([...Object.keys(serviceMap), ...Object.keys(productMap)]);
      let totalServiceRevenue = 0;
      let totalProductRevenue = 0;
      Object.values(serviceMap).forEach(v => { totalServiceRevenue += v.serviceRevenue; });
      Object.values(productMap).forEach(v => { totalProductRevenue += v.productRevenue; });

      const staffData: StaffServiceProduct[] = Array.from(mergedStaffIds).map(staffId => {
        const svc = serviceMap[staffId] || { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        const prod = productMap[staffId] || { productRevenue: 0, productCount: 0, items: [] };
        const sortedItems = [...prod.items].sort((a, b) => b.amount - a.amount);
        return {
          phorestStaffId: staffId,
          staffName: staffLookup[staffId] || 'Unknown',
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
