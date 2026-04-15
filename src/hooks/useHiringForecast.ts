import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveLocations } from './useLocations';
import { subDays, addDays, format } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

interface LocationForecast {
  locationId: string;
  locationName: string;
  currentStylists: number;
  currentAssistants: number;
  plannedDepartures: number;
  departureDetails: {
    name: string;
    date: string;
    role: string;
  }[];
  appointmentGrowthRate: number;
  growthBasedNeed: number;
  totalForecastedHires: number;
}

export interface HiringForecast {
  locations: LocationForecast[];
  totalPlannedDepartures: number;
  totalGrowthBasedNeed: number;
  totalForecastedHires: number;
  averageGrowthRate: number;
}

export function useHiringForecast() {
  const { data: locations } = useActiveLocations();
  
  return useQuery({
    queryKey: ['hiring-forecast', locations?.map(l => l.id)],
    queryFn: async (): Promise<HiringForecast> => {
      if (!locations || locations.length === 0) {
        return {
          locations: [],
          totalPlannedDepartures: 0,
          totalGrowthBasedNeed: 0,
          totalForecastedHires: 0,
          averageGrowthRate: 0,
        };
      }

      const today = new Date();
      const ninetyDaysOut = addDays(today, 90);
      const thirtyDaysAgo = subDays(today, 30);
      const sixtyDaysAgo = subDays(today, 60);

      // Fetch planned departures in next 90 days
      const { data: departures } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, location_ids, planned_departure_date')
        .not('planned_departure_date', 'is', null)
        .gte('planned_departure_date', format(today, 'yyyy-MM-dd'))
        .lte('planned_departure_date', format(ninetyDaysOut, 'yyyy-MM-dd'))
        .eq('is_active', true);

      // Fetch departing employees' roles
      const departureUserIds = departures?.map(d => d.user_id) || [];
      const { data: departureRoles } = departureUserIds.length > 0
        ? await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', departureUserIds)
            .in('role', ['stylist', 'stylist_assistant'])
        : { data: [] };

      // Fetch appointment counts for growth calculation - use location_id
      const [recentAppointments, priorAppointments] = await Promise.all([
        fetchAllBatched<any>((from, to) =>
          supabase
            .from('v_all_appointments' as any)
            .select('location_id, start_time')
            .gte('start_time', format(thirtyDaysAgo, 'yyyy-MM-dd'))
            .lt('start_time', format(today, 'yyyy-MM-dd'))
            .range(from, to)
        ),
        fetchAllBatched<any>((from, to) =>
          supabase
            .from('v_all_appointments' as any)
            .select('location_id, start_time')
            .gte('start_time', format(sixtyDaysAgo, 'yyyy-MM-dd'))
            .lt('start_time', format(thirtyDaysAgo, 'yyyy-MM-dd'))
            .range(from, to)
        ),
      ]);

      // Fetch current staff counts
      const { data: employees } = await supabase
        .from('employee_profiles')
        .select('user_id, location_ids')
        .eq('is_active', true)
        .eq('is_approved', true);

      const employeeUserIds = employees?.map(e => e.user_id) || [];
      const { data: allRoles } = employeeUserIds.length > 0
        ? await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', employeeUserIds)
            .in('role', ['stylist', 'stylist_assistant'])
        : { data: [] };

      // Build location forecasts
      const locationForecasts: LocationForecast[] = locations.map(loc => {
        // Count current staff
        const locationEmployees = employees?.filter(e => 
          e.location_ids?.includes(loc.id)
        ) || [];
        const locationUserIds = locationEmployees.map(e => e.user_id);
        const locationRoles = allRoles?.filter(r => locationUserIds.includes(r.user_id)) || [];
        
        const currentStylists = locationRoles.filter(r => r.role === 'stylist').length;
        const currentAssistants = locationRoles.filter(r => r.role === 'stylist_assistant').length;

        // Count planned departures for this location
        const locationDepartures = departures?.filter(d => 
          d.location_ids?.includes(loc.id)
        ) || [];
        
        const departureDetails = locationDepartures.map(d => {
          const role = departureRoles?.find(r => r.user_id === d.user_id)?.role || 'unknown';
          return {
            name: d.full_name || 'Unknown',
            date: d.planned_departure_date || '',
            role: role === 'stylist' ? 'Stylist' : 'Assistant',
          };
        }).filter(d => d.role !== 'unknown');

        // Calculate appointment growth rate - use location_id instead of branch_id
        const recentCount = recentAppointments.filter(a => 
          a.location_id === loc.id
        ).length;
        
        const priorCount = priorAppointments.filter(a => 
          a.location_id === loc.id
        ).length;

        const growthRate = priorCount > 0 
          ? ((recentCount - priorCount) / priorCount) * 100 
          : 0;

        // Calculate growth-based hiring need
        // If growth is positive and significant (>10%), suggest hiring
        const totalStaff = currentStylists + currentAssistants;
        const growthBasedNeed = growthRate > 10 
          ? Math.ceil((growthRate / 100) * totalStaff * 0.5) 
          : 0;

        const totalForecastedHires = departureDetails.length + growthBasedNeed;

        return {
          locationId: loc.id,
          locationName: loc.name,
          currentStylists,
          currentAssistants,
          plannedDepartures: departureDetails.length,
          departureDetails,
          appointmentGrowthRate: Math.round(growthRate * 10) / 10,
          growthBasedNeed,
          totalForecastedHires,
        };
      });

      // Calculate totals
      const totalPlannedDepartures = locationForecasts.reduce(
        (sum, loc) => sum + loc.plannedDepartures, 0
      );
      const totalGrowthBasedNeed = locationForecasts.reduce(
        (sum, loc) => sum + loc.growthBasedNeed, 0
      );
      const totalForecastedHires = locationForecasts.reduce(
        (sum, loc) => sum + loc.totalForecastedHires, 0
      );
      const averageGrowthRate = locationForecasts.length > 0
        ? locationForecasts.reduce((sum, loc) => sum + loc.appointmentGrowthRate, 0) / locationForecasts.length
        : 0;

      return {
        locations: locationForecasts,
        totalPlannedDepartures,
        totalGrowthBasedNeed,
        totalForecastedHires,
        averageGrowthRate: Math.round(averageGrowthRate * 10) / 10,
      };
    },
    enabled: !!locations && locations.length > 0,
  });
}
