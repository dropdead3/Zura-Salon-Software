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
      // Get staff mappings
      const { data: mappings } = await supabase
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

      const mappingLookup: Record<string, { userId: string; name: string }> = {};
      mappings?.forEach(m => {
        const profile = m.employee_profiles as any;
        mappingLookup[m.phorest_staff_id] = {
          userId: m.user_id,
          name: profile ? formatDisplayName(profile.full_name || '', profile.display_name) : 'Unknown',
        };
      });

      // Fetch appointments for rebooking, retention, new clients
      const appointments = await fetchAllBatched<{
        phorest_staff_id: string | null;
        phorest_client_id: string | null;
        rebooked_at_checkout: boolean | null;
        is_new_client: boolean | null;
        status: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('phorest_staff_id, phorest_client_id, rebooked_at_checkout, is_new_client, status')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Get transaction items for accurate POS revenue
      const allItems = await fetchAllBatched<{
        phorest_staff_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        phorest_client_id: string | null;
        transaction_date: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('phorest_staff_id, total_amount, tax_amount, phorest_client_id, transaction_date')
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
        const staffId = item.phorest_staff_id;
        if (!staffId) return;

        const mapping = mappingLookup[staffId];
        if (!mapping) return;

        if (!staffData[mapping.userId]) {
          staffData[mapping.userId] = {
            staffId: mapping.userId,
            staffName: mapping.name,
            totalRevenue: 0,
            totalServices: 0,
            averageTicket: 0,
            rebookingRate: 0,
            retentionRate: 0,
            newClients: 0,
          };
          staffVisitSets[mapping.userId] = new Set();
        }

        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        staffData[mapping.userId].totalRevenue += amount;
        staffData[mapping.userId].totalServices += 1;
        const visitKey = `${item.phorest_client_id}|${item.transaction_date}`;
        staffVisitSets[mapping.userId].add(visitKey);
      });

      // Process appointments for rebooking, retention, new clients per staff
      const staffAppts = new Map<string, typeof appointments>();
      appointments.forEach(apt => {
        const sid = apt.phorest_staff_id;
        if (!sid) return;
        const mapping = mappingLookup[sid];
        if (!mapping) return;
        if (!staffAppts.has(mapping.userId)) staffAppts.set(mapping.userId, []);
        staffAppts.get(mapping.userId)!.push(apt);
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
