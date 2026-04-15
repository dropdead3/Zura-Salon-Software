import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

interface StaffKPI {
  staffId: string;
  staffName: string;
  totalRevenue: number;
  totalServices: number;
  averageTicket: number;
  rebookingRate: number;
  retentionRate: number;
  newClients: number;
}

export function useStaffKPIReport(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['staff-kpi-report', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<StaffKPI[]> => {
      // Get all active staff from employee_profiles (no phorest_staff_mapping dependency)
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .eq('is_active', true);

      const profileLookup: Record<string, string> = {};
      (profiles || []).forEach(p => {
        profileLookup[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
      });

      // Fetch appointments from union view — filter by stylist_user_id
      const appointments = await fetchAllBatched<{
        stylist_user_id: string | null;
        phorest_client_id: string | null;
        rebooked_at_checkout: boolean | null;
        is_new_client: boolean | null;
        status: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('stylist_user_id, phorest_client_id, rebooked_at_checkout, is_new_client, status')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Fetch transaction items from union view — filter by staff_user_id
      const allItems = await fetchAllBatched<{
        staff_user_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        phorest_client_id: string | null;
        transaction_date: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_transaction_items' as any)
          .select('staff_user_id, total_amount, tax_amount, phorest_client_id, transaction_date')
          .gte('transaction_date', dateFrom)
          .lte('transaction_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Aggregate by staff
      const staffData: Record<string, StaffKPI> = {};
      const staffVisitSets: Record<string, Set<string>> = {};

      // Process transaction items for revenue
      allItems.forEach(item => {
        const staffId = item.staff_user_id ? String(item.staff_user_id) : null;
        if (!staffId) return;

        const staffName = profileLookup[staffId];
        if (!staffName) return;

        if (!staffData[staffId]) {
          staffData[staffId] = {
            staffId,
            staffName,
            totalRevenue: 0,
            totalServices: 0,
            averageTicket: 0,
            rebookingRate: 0,
            retentionRate: 0,
            newClients: 0,
          };
          staffVisitSets[staffId] = new Set();
        }

        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        staffData[staffId].totalRevenue += amount;
        staffData[staffId].totalServices += 1;
        const visitKey = `${item.phorest_client_id}|${item.transaction_date}`;
        staffVisitSets[staffId].add(visitKey);
      });

      // Process appointments for rebooking, retention, new clients per staff
      const staffAppts = new Map<string, typeof appointments>();
      appointments.forEach(apt => {
        const sid = apt.stylist_user_id ? String(apt.stylist_user_id) : null;
        if (!sid) return;
        const staffName = profileLookup[sid];
        if (!staffName) return;
        if (!staffAppts.has(sid)) staffAppts.set(sid, []);
        staffAppts.get(sid)!.push(apt);
      });

      staffAppts.forEach((apts, userId) => {
        if (!staffData[userId]) return;
        const valid = apts.filter(a => !['cancelled', 'no_show'].includes((a.status || '').toLowerCase()));
        // Rebooking
        staffData[userId].rebookingRate = valid.length > 0
          ? (valid.filter(a => a.rebooked_at_checkout).length / valid.length) * 100
          : 0;
        // New clients
        staffData[userId].newClients = valid.filter(a => a.is_new_client).length;
        // Retention: returning clients / total unique clients
        const uniqueClients = new Set(valid.map(a => a.phorest_client_id).filter(Boolean));
        const newClientIds = new Set(valid.filter(a => a.is_new_client).map(a => a.phorest_client_id).filter(Boolean));
        const returningCount = uniqueClients.size - newClientIds.size;
        staffData[userId].retentionRate = uniqueClients.size > 0
          ? (returningCount / uniqueClients.size) * 100
          : 0;
      });

      // Calculate averages using unique visits
      Object.entries(staffData).forEach(([userId, staff]) => {
        const visits = staffVisitSets[userId]?.size || 0;
        staff.averageTicket = visits > 0 
          ? staff.totalRevenue / visits 
          : 0;
      });

      return Object.values(staffData).sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
  });
}
