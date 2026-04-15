import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, startOfMonth, differenceInMinutes, parseISO, addDays } from 'date-fns';
import { getServiceCategory } from '@/utils/serviceCategorization';
import { isClosedOnDate } from '@/hooks/useLocations';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface DayCapacity {
  date: string;
  dayName: string;
  availableHours: number;
  bookedHours: number;
  utilizationPercent: number;
  appointmentCount: number;
  revenue: number;
  gapHours: number;
  isClosed: boolean;
}

export interface ServiceMix {
  category: string;
  hours: number;
  revenue: number;
  count: number;
  percentage: number;
}

export interface CapacityBreakdownData {
  grossHoursPerStylist: number;
  breakMinutes: number;
  lunchMinutes: number;
  paddingMinutes: number;
  stylistCount: number;
  daysInPeriod: number;
}

export interface CapacityData {
  totalAvailableHours: number;
  totalBookedHours: number;
  overallUtilization: number;
  gapHours: number;
  gapRevenue: number;
  avgHourlyRevenue: number;
  dailyCapacity: DayCapacity[];
  serviceMix: ServiceMix[];
  totalAppointments: number;
  peakDay: DayCapacity | null;
  lowDay: DayCapacity | null;
  breakdown: CapacityBreakdownData;
}

// Parse hours from location hours_json for a specific day
function getGrossOperatingHours(hoursJson: Record<string, any> | null, dayOfWeek: number): number {
  if (!hoursJson) return 8; // Default to 8 hours
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  const dayHours = hoursJson[dayName];
  
  if (!dayHours || dayHours.closed) return 0;
  
  try {
    const [openHour, openMin] = (dayHours.open || '09:00').split(':').map(Number);
    const [closeHour, closeMin] = (dayHours.close || '18:00').split(':').map(Number);
    return (closeHour + closeMin / 60) - (openHour + openMin / 60);
  } catch {
    return 8; // Default fallback
  }
}

// Calculate effective hours after subtracting breaks and lunch
function getEffectiveHoursForDay(
  hoursJson: Record<string, any> | null, 
  dayOfWeek: number,
  breakMinutes: number,
  lunchMinutes: number
): number {
  const grossHours = getGrossOperatingHours(hoursJson, dayOfWeek);
  if (grossHours === 0) return 0; // Closed day
  
  const nonProductiveHours = (breakMinutes + lunchMinutes) / 60;
  return Math.max(0, grossHours - nonProductiveHours);
}

export type CapacityDateRange = 'tomorrow' | '7days' | '30days' | '90days';

export function useHistoricalCapacityUtilization(
  locationId?: string,
  dateRange: CapacityDateRange = '30days'
) {
  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;
  
  switch (dateRange) {
    case 'tomorrow':
      startDate = addDays(today, 1);
      endDate = addDays(today, 1);
      break;
    case '7days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 7);
      break;
    case '30days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 30);
      break;
    case '90days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 90);
      break;
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch locations data
  const locationsQuery = useQuery({
    queryKey: ['locations-capacity-historical', locationId],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('id, name, stylist_capacity, hours_json, holiday_closures, break_minutes_per_day, lunch_minutes, appointment_padding_minutes')
        .eq('is_active', true);

      if (locationId) {
        query = query.eq('id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch appointments for the historical period
  const appointmentsQuery = useQuery({
    queryKey: ['historical-capacity-appointments', locationId, startDateStr, endDateStr],
    queryFn: async () => {
      return fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('appointment_date, start_time, end_time, total_price, tip_amount, service_name, location_id, status')
          .gte('appointment_date', startDateStr)
          .lte('appointment_date', endDateStr)
          .not('status', 'in', '("cancelled","no_show")')
          .eq('is_demo', false)
          .range(from, to);

        if (locationId) {
          q = q.eq('location_id', locationId);
        }

        return q;
      });
    },
  });

  // Calculate capacity data
  const capacityData: CapacityData | null = (() => {
    if (!locationsQuery.data || !appointmentsQuery.data) return null;

    const locations = locationsQuery.data;
    const appointments = appointmentsQuery.data;

    if (locations.length === 0) return null;

    // Calculate aggregate breakdown data for display
    const totalStylistCapacity = locations.reduce((sum, loc) => sum + (loc.stylist_capacity || 4), 0);
    const avgBreakMins = locations.reduce((sum, loc) => sum + (loc.break_minutes_per_day ?? 30), 0) / locations.length;
    const avgLunchMins = locations.reduce((sum, loc) => sum + (loc.lunch_minutes ?? 45), 0) / locations.length;
    const avgPaddingMins = locations.reduce((sum, loc) => sum + (loc.appointment_padding_minutes ?? 10), 0) / locations.length;
    
    // Calculate average gross hours per stylist per day (from first open day as sample)
    let avgGrossHoursPerStylist = 8; // Default
    for (let d = 0; d <= 6; d++) {
      const grossHours = getGrossOperatingHours(locations[0].hours_json as Record<string, any> | null, d);
      if (grossHours > 0) {
        avgGrossHoursPerStylist = grossHours;
        break;
      }
    }

    // Calculate daily capacity
    const dailyMap = new Map<string, DayCapacity>();
    const serviceMixMap = new Map<string, ServiceMix>();

    // Determine closed dates
    const closedDates = new Set<string>();

    // Initialize days in range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay();

      // Check if all locations are closed on this date
      const allClosed = locations.every(loc =>
        isClosedOnDate(loc.hours_json as any, loc.holiday_closures as any, currentDate).isClosed
      );
      if (allClosed) closedDates.add(dateStr);
      
      // Calculate available hours for this day across all relevant locations
      let dayAvailableHours = 0;
      if (!allClosed) {
        locations.forEach(loc => {
          const hoursJson = loc.hours_json as Record<string, any> | null;
          const breakMins = loc.break_minutes_per_day ?? 30;
          const lunchMins = loc.lunch_minutes ?? 45;
          const effectiveHours = getEffectiveHoursForDay(hoursJson, dayOfWeek, breakMins, lunchMins);
          const capacity = loc.stylist_capacity || 4;
          dayAvailableHours += effectiveHours * capacity;
        });
      }

      dailyMap.set(dateStr, {
        date: dateStr,
        dayName: format(currentDate, 'EEE'),
        availableHours: dayAvailableHours,
        bookedHours: 0,
        utilizationPercent: 0,
        appointmentCount: 0,
        revenue: 0,
        gapHours: dayAvailableHours,
        isClosed: allClosed,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process appointments
    appointments.forEach(apt => {
      const dateStr = apt.appointment_date;
      const dayData = dailyMap.get(dateStr);
      if (!dayData) return;

      // Calculate duration
      let durationHours = 1; // Default 1 hour
      if (apt.start_time && apt.end_time) {
        const [startH, startM] = apt.start_time.split(':').map(Number);
        const [endH, endM] = apt.end_time.split(':').map(Number);
        durationHours = (endH + endM / 60) - (startH + startM / 60);
        if (durationHours <= 0) durationHours = 1;
      }

      const revenue = (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);

      dayData.bookedHours += durationHours;
      dayData.appointmentCount += 1;
      dayData.revenue += revenue;

      // Service mix
      const category = getServiceCategory(apt.service_name || 'Other');
      const existing = serviceMixMap.get(category) || { category, hours: 0, revenue: 0, count: 0, percentage: 0 };
      existing.hours += durationHours;
      existing.revenue += revenue;
      existing.count += 1;
      serviceMixMap.set(category, existing);
    });

    // Calculate utilization percentages and gap hours
    dailyMap.forEach((day) => {
      if (day.availableHours > 0) {
        day.utilizationPercent = Math.round((day.bookedHours / day.availableHours) * 100);
      }
      day.gapHours = Math.max(0, day.availableHours - day.bookedHours);
    });

    // Aggregate totals (exclude closed days)
    let totalAvailableHours = 0;
    let totalBookedHours = 0;
    let totalRevenue = 0;
    let totalAppointments = 0;

    dailyMap.forEach((day) => {
      if (day.isClosed) return;
      totalAvailableHours += day.availableHours;
      totalBookedHours += day.bookedHours;
      totalRevenue += day.revenue;
      totalAppointments += day.appointmentCount;
    });

    const overallUtilization = totalAvailableHours > 0 
      ? Math.round((totalBookedHours / totalAvailableHours) * 100)
      : 0;

    const gapHours = Math.max(0, totalAvailableHours - totalBookedHours);
    const avgHourlyRevenue = totalBookedHours > 0 ? Math.round(totalRevenue / totalBookedHours) : 0;
    const gapRevenue = Math.round(gapHours * avgHourlyRevenue);

    // Calculate service mix percentages
    const totalServiceHours = Array.from(serviceMixMap.values()).reduce((sum, s) => sum + s.hours, 0);
    serviceMixMap.forEach((service) => {
      service.percentage = totalServiceHours > 0 ? Math.round((service.hours / totalServiceHours) * 100) : 0;
    });

    // Find peak and low days (only days with availability)
    const dailyCapacity = Array.from(dailyMap.values());
    const daysWithAvailability = dailyCapacity.filter(d => d.availableHours > 0);
    
    let peakDay: DayCapacity | null = null;
    let lowDay: DayCapacity | null = null;
    
    if (daysWithAvailability.length > 0) {
      peakDay = daysWithAvailability.reduce((max, day) => 
        day.utilizationPercent > max.utilizationPercent ? day : max
      , daysWithAvailability[0]);
      
      lowDay = daysWithAvailability.reduce((min, day) => 
        day.utilizationPercent < min.utilizationPercent ? day : min
      , daysWithAvailability[0]);
    }

    // Calculate days in period
    const daysInPeriod = dailyCapacity.length;

    return {
      totalAvailableHours: Math.round(totalAvailableHours),
      totalBookedHours: Math.round(totalBookedHours),
      overallUtilization,
      gapHours: Math.round(gapHours),
      gapRevenue,
      avgHourlyRevenue,
      dailyCapacity,
      serviceMix: Array.from(serviceMixMap.values()).sort((a, b) => b.hours - a.hours),
      totalAppointments,
      peakDay,
      lowDay,
      breakdown: {
        grossHoursPerStylist: Math.round(avgGrossHoursPerStylist * 10) / 10,
        breakMinutes: Math.round(avgBreakMins),
        lunchMinutes: Math.round(avgLunchMins),
        paddingMinutes: Math.round(avgPaddingMins),
        stylistCount: totalStylistCapacity,
        daysInPeriod,
      },
    };
  })();

  return {
    capacityData,
    isLoading: locationsQuery.isLoading || appointmentsQuery.isLoading,
    error: locationsQuery.error || appointmentsQuery.error,
  };
}
