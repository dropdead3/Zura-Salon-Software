import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';

export interface StaffWorkload {
  userId: string;
  phorestStaffId: string;
  name: string;
  displayName: string | null;
  photoUrl: string | null;
  appointmentCount: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  averagePerDay: number;
  utilizationScore: number; // 0-100 based on relative workload
  totalRevenue: number;
  averageTicket: number;
  efficiencyScore: number; // 100 = team average
}

export interface ServiceQualification {
  userId: string;
  staffName: string;
  qualifiedServices: string[];
  serviceCategories: string[];
}

export interface LocationDistribution {
  locationId: string;
  locationName: string;
  appointmentCount: number;
  percentage: number;
}

export type StaffDateRange = 'tomorrow' | '7days' | '30days' | '90days';

export function useStaffUtilization(locationId?: string, dateRange: StaffDateRange = '30days') {
  // Calculate date range
  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;
  let daysInRange: number;
  
  switch (dateRange) {
    case 'tomorrow':
      startDate = addDays(today, 1);
      endDate = addDays(today, 1);
      daysInRange = 1;
      break;
    case '7days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 7);
      daysInRange = 7;
      break;
    case '30days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 30);
      daysInRange = 30;
      break;
    case '90days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 90);
      daysInRange = 90;
      break;
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch service provider IDs (stylists and stylist assistants only)
  const roleQuery = useQuery({
    queryKey: ['service-provider-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant']);
      if (error) throw error;
      return (data || []).map(r => r.user_id);
    },
  });

  const serviceProviderIds = roleQuery.data || [];

  // Fetch staff workload data
  const workloadQuery = useQuery({
    queryKey: ['staff-utilization-workload', locationId, startDateStr, endDateStr, serviceProviderIds],
    enabled: serviceProviderIds.length > 0,
    queryFn: async () => {
      // Get staff mappings filtered to service providers only
      const { data: staffMappings, error: staffError } = await supabase
        .from('phorest_staff_mapping')
        .select(`
          user_id,
          phorest_staff_id,
          employee_profiles!phorest_staff_mapping_user_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
        .eq('is_active', true)
        .in('user_id', serviceProviderIds);

      if (staffError) throw staffError;

      // Then get appointments with revenue data (paginated)
      const appointments = await fetchAllBatched<{
        stylist_user_id: string | null;
        status: string | null;
        total_price: number | null;
        tip_amount: number | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('stylist_user_id, status, total_price, tip_amount')
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .not('status', 'eq', 'cancelled')
          .range(from, to);

        if (locationId && locationId !== 'all') {
          const ids = locationId.split(',').filter(Boolean);
          if (ids.length === 1) q = q.eq('location_id', ids[0]);
          else if (ids.length > 1) q = q.in('location_id', ids);
        }
        return q;
      });

      // Aggregate by staff
      const staffStats = new Map<string, {
        appointmentCount: number;
        completedCount: number;
        noShowCount: number;
        cancelledCount: number;
        totalRevenue: number;
      }>();

      (appointments || []).forEach(apt => {
        if (!apt.stylist_user_id) return;
        
        const existing = staffStats.get(apt.stylist_user_id) || {
          appointmentCount: 0,
          completedCount: 0,
          noShowCount: 0,
          cancelledCount: 0,
          totalRevenue: 0,
        };

        existing.appointmentCount++;
        existing.totalRevenue += (Number(apt.total_price) || 0) - (Number((apt as any).tip_amount) || 0);
        if (apt.status === 'completed') existing.completedCount++;
        if (apt.status === 'no_show') existing.noShowCount++;

        staffStats.set(apt.stylist_user_id, existing);
      });

      // Calculate max for utilization score
      const maxAppointments = Math.max(...Array.from(staffStats.values()).map(s => s.appointmentCount), 1);

      // Calculate team average ticket for efficiency score
      const allStats = Array.from(staffStats.values());
      const totalTeamRevenue = allStats.reduce((sum, s) => sum + s.totalRevenue, 0);
      const totalTeamAppointments = allStats.reduce((sum, s) => sum + s.appointmentCount, 0);
      const teamAvgTicket = totalTeamAppointments > 0 ? totalTeamRevenue / totalTeamAppointments : 0;

      // Build workload array
      const workload: StaffWorkload[] = (staffMappings || []).map((staff: any) => {
        const stats = staffStats.get(staff.user_id) || {
          appointmentCount: 0,
          completedCount: 0,
          noShowCount: 0,
          cancelledCount: 0,
          totalRevenue: 0,
        };

        const averageTicket = stats.appointmentCount > 0 
          ? stats.totalRevenue / stats.appointmentCount 
          : 0;
        
        // Efficiency score: 100 = team average, higher = more productive
        const efficiencyScore = teamAvgTicket > 0 
          ? Math.min(200, Math.round((averageTicket / teamAvgTicket) * 100))
          : 100;

        return {
          userId: staff.user_id,
          phorestStaffId: staff.phorest_staff_id,
          name: staff.employee_profiles?.full_name || 'Unknown',
          displayName: staff.employee_profiles?.display_name,
          photoUrl: staff.employee_profiles?.photo_url,
          ...stats,
          averagePerDay: daysInRange > 0 ? stats.appointmentCount / daysInRange : 0,
          utilizationScore: (stats.appointmentCount / maxAppointments) * 100,
          averageTicket,
          efficiencyScore,
        };
      });

      return workload.sort((a, b) => b.appointmentCount - a.appointmentCount);
    },
  });

  // Fetch service qualifications (service providers only)
  const qualificationsQuery = useQuery({
    queryKey: ['staff-service-qualifications', serviceProviderIds],
    enabled: serviceProviderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_staff_services')
        .select(`
          phorest_staff_id,
          phorest_service_id,
          is_qualified,
          phorest_services(
            name,
            category
          ),
          phorest_staff_mapping!inner(
            user_id,
            employee_profiles!phorest_staff_mapping_user_id_fkey(
              full_name,
              display_name
            )
          )
        `)
        .eq('is_qualified', true);

      if (error) throw error;

      // Group by staff -- only include service providers
      const providerSet = new Set(serviceProviderIds);
      const staffQualifications = new Map<string, ServiceQualification>();

      (data || []).forEach((qual: any) => {
        const userId = qual.phorest_staff_mapping?.user_id;
        if (!userId || !providerSet.has(userId)) return;

        const existing = staffQualifications.get(userId) || {
          userId,
          staffName: qual.phorest_staff_mapping?.employee_profiles?.display_name || 
                     qual.phorest_staff_mapping?.employee_profiles?.full_name || 'Unknown',
          qualifiedServices: [],
          serviceCategories: [],
        };

        if (qual.phorest_services?.name) {
          existing.qualifiedServices.push(qual.phorest_services.name);
        }
        if (qual.phorest_services?.category && !existing.serviceCategories.includes(qual.phorest_services.category)) {
          existing.serviceCategories.push(qual.phorest_services.category);
        }

        staffQualifications.set(userId, existing);
      });

      return Array.from(staffQualifications.values());
    },
  });

  // Fetch location distribution
  const locationQuery = useQuery({
    queryKey: ['staff-utilization-locations', startDateStr, endDateStr],
    queryFn: async () => {
      const { data: appointments, error: aptError } = await supabase
        .from('phorest_appointments')
        .select('location_id')
        .gte('appointment_date', startDateStr)
        .lte('appointment_date', endDateStr)
        .not('status', 'in', '("cancelled")');

      if (aptError) throw aptError;

      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('id, name');

      if (locError) throw locError;

      // Count by location
      const locationCounts = new Map<string, number>();
      (appointments || []).forEach(apt => {
        if (apt.location_id) {
          locationCounts.set(apt.location_id, (locationCounts.get(apt.location_id) || 0) + 1);
        }
      });

      const total = appointments?.length || 0;
      const distribution: LocationDistribution[] = (locations || []).map(loc => ({
        locationId: loc.id,
        locationName: loc.name,
        appointmentCount: locationCounts.get(loc.id) || 0,
        percentage: total > 0 ? ((locationCounts.get(loc.id) || 0) / total) * 100 : 0,
      })).filter(d => d.appointmentCount > 0);

      return distribution.sort((a, b) => b.appointmentCount - a.appointmentCount);
    },
  });

  return {
    workload: workloadQuery.data || [],
    qualifications: qualificationsQuery.data || [],
    locationDistribution: locationQuery.data || [],
    isLoading: roleQuery.isLoading || workloadQuery.isLoading || qualificationsQuery.isLoading || locationQuery.isLoading,
  };
}
