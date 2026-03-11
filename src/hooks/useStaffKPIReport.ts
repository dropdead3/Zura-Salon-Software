import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';

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

      // Get performance metrics
      let metricsQuery = supabase
        .from('phorest_performance_metrics')
        .select('phorest_staff_id, week_start, rebooking_rate, retention_rate, new_clients')
        .gte('week_start', dateFrom)
        .lte('week_start', dateTo);

      const { data: metrics } = await metricsQuery;

      // Get appointments for revenue
      let appointmentsQuery = supabase
        .from('phorest_appointments')
        .select('phorest_staff_id, total_price, phorest_client_id, appointment_date')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('total_price', 'is', null);

      if (locationId) {
        appointmentsQuery = appointmentsQuery.eq('location_id', locationId);
      }

      const { data: appointments } = await appointmentsQuery;

      // Aggregate by staff
      const staffData: Record<string, StaffKPI> = {};
      const staffVisitSets: Record<string, Set<string>> = {};

      // Process appointments for revenue
      appointments?.forEach(apt => {
        const staffId = apt.phorest_staff_id;
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

        staffData[mapping.userId].totalRevenue += Number(apt.total_price) || 0;
        staffData[mapping.userId].totalServices += 1;
        // Track unique client visits
        const visitKey = `${apt.phorest_client_id}|${(apt as any).appointment_date}`;
        staffVisitSets[mapping.userId].add(visitKey);
      });

      // Process metrics for KPIs
      metrics?.forEach(metric => {
        const staffId = metric.phorest_staff_id;
        if (!staffId) return;

        const mapping = mappingLookup[staffId];
        if (!mapping) return;

        if (staffData[mapping.userId]) {
          staffData[mapping.userId].rebookingRate = metric.rebooking_rate || 0;
          staffData[mapping.userId].retentionRate = metric.retention_rate || 0;
          staffData[mapping.userId].newClients += metric.new_clients || 0;
        }
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
