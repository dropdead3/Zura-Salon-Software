import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, differenceInMinutes, parseISO } from 'date-fns';
import { useActiveLocations, isClosedOnDate, type HoursJson } from '@/hooks/useLocations';
import { getServiceCategory } from '@/utils/serviceCategorization';

export type CapacityPeriod = 'tomorrow' | '7days' | '30days';

export interface ServiceMixItem {
  category: string;
  hours: number;
  revenue: number;
  appointmentCount: number;
  percentage: number;
}

export interface DayCapacity {
  date: string;
  dayName: string;
  availableHours: number;
  bookedHours: number;
  utilizationPercent: number;
  revenue: number;
  appointmentCount: number;
  gapHours: number;
  serviceMix: ServiceMixItem[];
  isClosed: boolean;
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
  days: DayCapacity[];
  totalAvailableHours: number;
  totalBookedHours: number;
  totalGapHours: number;
  overallUtilization: number;
  totalRevenue: number;
  totalAppointments: number;
  avgHourlyRevenue: number;
  gapRevenue: number;
  serviceMix: ServiceMixItem[];
  peakDay: DayCapacity | null;
  lowDay: DayCapacity | null;
  breakdown: CapacityBreakdownData;
}

const PERIOD_DAYS: Record<CapacityPeriod, number> = {
  'tomorrow': 1,
  '7days': 7,
  '30days': 30,
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Calculate gross operating hours from hours_json for a specific day
 */
function getGrossOperatingHours(hoursJson: HoursJson | null, dayOfWeek: number): number {
  if (!hoursJson) return 8; // Default to 8 hours if no hours set
  
  const dayName = DAY_NAMES[dayOfWeek];
  const dayHours = hoursJson[dayName];
  
  if (!dayHours || dayHours.closed) return 0;
  if (!dayHours.open || !dayHours.close) return 0;
  
  const [openHour, openMin] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  return (closeMinutes - openMinutes) / 60;
}

/**
 * Calculate effective hours after subtracting breaks and lunch
 */
function getEffectiveHours(
  hoursJson: HoursJson | null, 
  dayOfWeek: number,
  breakMinutes: number,
  lunchMinutes: number
): number {
  const grossHours = getGrossOperatingHours(hoursJson, dayOfWeek);
  if (grossHours === 0) return 0; // Closed day
  
  const nonProductiveHours = (breakMinutes + lunchMinutes) / 60;
  return Math.max(0, grossHours - nonProductiveHours);
}

/**
 * Calculate appointment duration in hours
 */
function getAppointmentDuration(startTime: string, endTime: string): number {
  try {
    const start = parseISO(`2000-01-01T${startTime}`);
    const end = parseISO(`2000-01-01T${endTime}`);
    return differenceInMinutes(end, start) / 60;
  } catch {
    return 1; // Default to 1 hour if parsing fails
  }
}

export function useCapacityUtilization(period: CapacityPeriod, locationId?: string) {
  const { data: locations = [] } = useActiveLocations();
  const today = new Date();
  const dayCount = PERIOD_DAYS[period];
  
  // Generate date range starting from tomorrow
  const dates = Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(today, i + 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE'),
      dayOfWeek: date.getDay(),
      fullDate: date,
    };
  });

  const startDate = dates[0].date;
  const endDate = dates[dates.length - 1].date;

  return useQuery({
    queryKey: ['capacity-utilization', period, startDate, endDate, locationId, locations.length],
    queryFn: async () => {
      // Get filtered locations (supports multi-select comma-separated ids)
      const filterIds = locationId && locationId !== 'all' ? locationId.split(',').filter(Boolean) : [];
      const filteredLocations = filterIds.length > 0
        ? locations.filter(l => filterIds.includes(l.id))
        : locations;

      if (filteredLocations.length === 0) {
        return {
          days: [],
          totalAvailableHours: 0,
          totalBookedHours: 0,
          totalGapHours: 0,
          overallUtilization: 0,
          totalRevenue: 0,
          totalAppointments: 0,
          avgHourlyRevenue: 0,
          gapRevenue: 0,
          serviceMix: [],
          peakDay: null,
          lowDay: null,
          breakdown: {
            grossHoursPerStylist: 8,
            breakMinutes: 30,
            lunchMinutes: 45,
            paddingMinutes: 10,
            stylistCount: 0,
            daysInPeriod: 0,
          },
        } as CapacityData;
      }

      // Calculate aggregate breakdown data for display
      const totalStylistCapacity = filteredLocations.reduce((sum, loc) => sum + (loc.stylist_capacity || 1), 0);
      const avgBreakMins = filteredLocations.reduce((sum, loc) => sum + (loc.break_minutes_per_day ?? 30), 0) / filteredLocations.length;
      const avgLunchMins = filteredLocations.reduce((sum, loc) => sum + (loc.lunch_minutes ?? 45), 0) / filteredLocations.length;
      const avgPaddingMins = filteredLocations.reduce((sum, loc) => sum + (loc.appointment_padding_minutes ?? 10), 0) / filteredLocations.length;
      
      // Calculate average gross hours per stylist per day (from first open day as sample)
      let avgGrossHoursPerStylist = 8;
      for (let d = 0; d <= 6; d++) {
        const grossHours = getGrossOperatingHours(filteredLocations[0].hours_json, d);
        if (grossHours > 0) {
          avgGrossHoursPerStylist = grossHours;
          break;
        }
      }

      // Fetch appointments
      let query = supabase
        .from('phorest_appointments')
        .select('id, appointment_date, total_price, status, service_name, start_time, end_time')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      // Calculate capacity for each date
      const byDate: Record<string, {
        availableHours: number;
        bookedHours: number;
        revenue: number;
        count: number;
        serviceMix: Record<string, { hours: number; revenue: number; count: number }>;
      }> = {};

      // Determine closed dates
      const closedDates = new Set<string>();
      dates.forEach(d => {
        const allClosed = filteredLocations.every(loc =>
          isClosedOnDate(loc.hours_json, loc.holiday_closures, d.fullDate).isClosed
        );
        if (allClosed) closedDates.add(d.date);
      });

      // Initialize each date with available hours
      dates.forEach(d => {
        let totalAvailable = 0;
        
        if (!closedDates.has(d.date)) {
          filteredLocations.forEach(loc => {
            const breakMins = loc.break_minutes_per_day ?? 30;
            const lunchMins = loc.lunch_minutes ?? 45;
            const effectiveHours = getEffectiveHours(loc.hours_json, d.dayOfWeek, breakMins, lunchMins);
            const capacity = loc.stylist_capacity || 1;
            totalAvailable += effectiveHours * capacity;
          });
        }

        byDate[d.date] = {
          availableHours: totalAvailable,
          bookedHours: 0,
          revenue: 0,
          count: 0,
          serviceMix: {},
        };
      });

      // Process appointments
      (appointments || []).forEach(apt => {
        const dateKey = apt.appointment_date;
        if (!byDate[dateKey]) return;

        const duration = getAppointmentDuration(apt.start_time, apt.end_time);
        const price = Number(apt.total_price) || 0;
        const category = getServiceCategory(apt.service_name);

        byDate[dateKey].bookedHours += duration;
        byDate[dateKey].revenue += price;
        byDate[dateKey].count += 1;

        // Track service mix
        if (!byDate[dateKey].serviceMix[category]) {
          byDate[dateKey].serviceMix[category] = { hours: 0, revenue: 0, count: 0 };
        }
        byDate[dateKey].serviceMix[category].hours += duration;
        byDate[dateKey].serviceMix[category].revenue += price;
        byDate[dateKey].serviceMix[category].count += 1;
      });

      // Build days array
      const days: DayCapacity[] = dates.map(d => {
        const dayData = byDate[d.date];
        const utilizationPercent = dayData.availableHours > 0
          ? Math.round((dayData.bookedHours / dayData.availableHours) * 100)
          : 0;

        // Convert service mix to array with percentages
        const totalHours = dayData.bookedHours || 1;
        const serviceMix: ServiceMixItem[] = Object.entries(dayData.serviceMix)
          .map(([category, data]) => ({
            category,
            hours: Math.round(data.hours * 10) / 10,
            revenue: data.revenue,
            appointmentCount: data.count,
            percentage: Math.round((data.hours / totalHours) * 100),
          }))
          .sort((a, b) => b.hours - a.hours);

        return {
          date: d.date,
          dayName: d.dayName,
          availableHours: Math.round(dayData.availableHours * 10) / 10,
          bookedHours: Math.round(dayData.bookedHours * 10) / 10,
          utilizationPercent,
          revenue: dayData.revenue,
          appointmentCount: dayData.count,
          gapHours: Math.round((dayData.availableHours - dayData.bookedHours) * 10) / 10,
          serviceMix,
          isClosed: closedDates.has(d.date),
        };
      });

      // Calculate totals (exclude closed days)
      const openDays = days.filter(d => !d.isClosed);
      const totalAvailableHours = openDays.reduce((sum, d) => sum + d.availableHours, 0);
      const totalBookedHours = openDays.reduce((sum, d) => sum + d.bookedHours, 0);
      const totalGapHours = totalAvailableHours - totalBookedHours;
      const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
      const totalAppointments = days.reduce((sum, d) => sum + d.appointmentCount, 0);
      
      const overallUtilization = totalAvailableHours > 0
        ? Math.round((totalBookedHours / totalAvailableHours) * 100)
        : 0;

      const avgHourlyRevenue = totalBookedHours > 0 
        ? Math.round(totalRevenue / totalBookedHours)
        : 0;

      const gapRevenue = Math.round(totalGapHours * avgHourlyRevenue);

      // Aggregate service mix across all days
      const aggregatedMix: Record<string, { hours: number; revenue: number; count: number }> = {};
      days.forEach(day => {
        day.serviceMix.forEach(item => {
          if (!aggregatedMix[item.category]) {
            aggregatedMix[item.category] = { hours: 0, revenue: 0, count: 0 };
          }
          aggregatedMix[item.category].hours += item.hours;
          aggregatedMix[item.category].revenue += item.revenue;
          aggregatedMix[item.category].count += item.appointmentCount;
        });
      });

      const serviceMix: ServiceMixItem[] = Object.entries(aggregatedMix)
        .map(([category, data]) => ({
          category,
          hours: Math.round(data.hours * 10) / 10,
          revenue: data.revenue,
          appointmentCount: data.count,
          percentage: totalBookedHours > 0 
            ? Math.round((data.hours / totalBookedHours) * 100)
            : 0,
        }))
        .sort((a, b) => b.hours - a.hours);

      // Find peak and low days (excluding days with 0 capacity - closed days)
      const activeDays = days.filter(d => d.availableHours > 0);
      const peakDay = activeDays.reduce<DayCapacity | null>((peak, day) => {
        if (!peak || day.utilizationPercent > peak.utilizationPercent) return day;
        return peak;
      }, null);

      const lowDay = activeDays.reduce<DayCapacity | null>((low, day) => {
        if (!low || day.utilizationPercent < low.utilizationPercent) return day;
        return low;
      }, null);

      return {
        days,
        totalAvailableHours: Math.round(totalAvailableHours * 10) / 10,
        totalBookedHours: Math.round(totalBookedHours * 10) / 10,
        totalGapHours: Math.round(totalGapHours * 10) / 10,
        overallUtilization,
        totalRevenue,
        totalAppointments,
        avgHourlyRevenue,
        gapRevenue,
        serviceMix,
        peakDay,
        lowDay,
        breakdown: {
          grossHoursPerStylist: Math.round(avgGrossHoursPerStylist * 10) / 10,
          breakMinutes: Math.round(avgBreakMins),
          lunchMinutes: Math.round(avgLunchMins),
          paddingMinutes: Math.round(avgPaddingMins),
          stylistCount: totalStylistCapacity,
          daysInPeriod: days.length,
        },
      } as CapacityData;
    },
    enabled: locations.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
