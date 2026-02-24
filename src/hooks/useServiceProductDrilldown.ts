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

      // Aggregate by staff
      const staffMap: Record<string, { serviceRevenue: number; serviceCount: number; tipTotal: number }> = {};

      (appointments || []).forEach(appt => {
        const sid = appt.phorest_staff_id;
        if (!sid) return;
        if (!staffMap[sid]) {
          staffMap[sid] = { serviceRevenue: 0, serviceCount: 0, tipTotal: 0 };
        }
        staffMap[sid].serviceRevenue += Number(appt.total_price) || 0;
        staffMap[sid].serviceCount += 1;
        staffMap[sid].tipTotal += Number(appt.tip_amount) || 0;
      });

      let totalServiceRevenue = 0;
      Object.values(staffMap).forEach(v => {
        totalServiceRevenue += v.serviceRevenue;
      });

      const staffData: StaffServiceProduct[] = Object.entries(staffMap)
        .map(([phorestStaffId, v]) => ({
          phorestStaffId,
          staffName: staffLookup[phorestStaffId] || 'Unknown',
          serviceRevenue: v.serviceRevenue,
          serviceCount: v.serviceCount,
          productRevenue: 0,
          productCount: 0,
          retailToServiceRatio: 0,
          sharePercent: 0,
          tipTotal: v.tipTotal,
        }));

      return {
        staffData,
        totalServiceRevenue,
        totalProductRevenue: 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
