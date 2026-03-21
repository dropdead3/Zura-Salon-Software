import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek, endOfWeek, endOfMonth, differenceInDays } from 'date-fns';
import { getServiceCategory } from '@/utils/serviceCategorization';

export type ForecastPeriod = 'tomorrow' | '7days' | '30days' | '60days' | 'todayToEom';

export interface AppointmentSummary {
  id: string;
  client_name: string | null;
  service_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number | null;
  stylist_name: string | null;
  location_id?: string | null;
}

export interface DayForecast {
  date: string;
  dayName: string;
  revenue: number;
  confirmedRevenue: number;
  unconfirmedRevenue: number;
  appointmentCount: number;
  appointments: AppointmentSummary[];
  categoryBreakdown: Record<string, number>;
}

export interface WeekForecast {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  revenue: number;
  confirmedRevenue: number;
  unconfirmedRevenue: number;
  appointmentCount: number;
  days: DayForecast[];
  categoryBreakdown: Record<string, number>;
}

export interface CategoryBreakdown {
  revenue: number;
  count: number;
}

export interface ForecastData {
  days: DayForecast[];
  weeks: WeekForecast[];
  totalRevenue: number;
  totalAppointments: number;
  averageDaily: number;
  averageWeekly: number;
  peakDay: DayForecast | null;
  peakWeek: WeekForecast | null;
  byCategory: Record<string, CategoryBreakdown>;
  byLocation: Record<string, CategoryBreakdown>;
  byStylist: Record<string, CategoryBreakdown>;
}

const PERIOD_DAYS: Record<Exclude<ForecastPeriod, 'todayToEom'>, number> = {
  'tomorrow': 1,
  '7days': 7,
  '30days': 30,
  '60days': 60,
};

// Helper to get day count for a period
function getDayCount(period: ForecastPeriod): number {
  if (period === 'todayToEom') {
    const today = new Date();
    return differenceInDays(endOfMonth(today), today) + 1;
  }
  return PERIOD_DAYS[period];
}

export function useForecastRevenue(period: ForecastPeriod, locationId?: string) {
  const today = new Date();
  const dayCount = getDayCount(period);
  
  // For todayToEom, start from today; for others, start from tomorrow
  const startFromToday = period === 'todayToEom';
  
  // Generate date range
  const dates = Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(today, startFromToday ? i : i + 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE'),
      fullDate: date,
    };
  });

  const startDate = dates[0].date;
  const endDate = dates[dates.length - 1].date;

  return useQuery({
    queryKey: ['forecast-revenue', period, startDate, endDate, locationId],
    queryFn: async () => {
      let query = supabase
        .from('phorest_appointments')
        .select('id, appointment_date, total_price, status, client_name, service_name, start_time, end_time, phorest_staff_id, service_category, location_id')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .not('status', 'in', '("cancelled","no_show")')
        .order('start_time', { ascending: true });

      // Filter by location if specified
      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const appointments = data || [];

      // Fetch staff names for the appointments
      const staffIds = [...new Set(appointments.map(a => a.phorest_staff_id).filter(Boolean))] as string[];
      const staffMap: Record<string, string> = {};
      
      if (staffIds.length > 0) {
        const { data: staffData } = await (supabase as any)
          .from('phorest_staff_mappings')
          .select('phorest_staff_id, staff_first_name, staff_last_name')
          .in('phorest_staff_id', staffIds);
        
        if (staffData) {
          (staffData as any[]).forEach((s: any) => {
            if (s.phorest_staff_id) {
              staffMap[s.phorest_staff_id] = `${s.staff_first_name || ''} ${s.staff_last_name?.charAt(0) || ''}.`.trim();
            }
          });
        }
      }
      
      // Group by date
      const byDate: Record<string, { revenue: number; confirmedRevenue: number; unconfirmedRevenue: number; count: number; appointments: AppointmentSummary[]; categoryBreakdown: Record<string, number> }> = {};
      dates.forEach(d => {
        byDate[d.date] = { revenue: 0, confirmedRevenue: 0, unconfirmedRevenue: 0, count: 0, appointments: [], categoryBreakdown: {} };
      });

      appointments.forEach(apt => {
        const dateKey = apt.appointment_date;
        if (byDate[dateKey]) {
          const price = Number(apt.total_price) || 0;
          const status = apt.status?.toLowerCase() || '';
          const isUnconfirmed = status === 'unconfirmed' || status === 'pending';
          
          byDate[dateKey].revenue += price;
          if (isUnconfirmed) {
            byDate[dateKey].unconfirmedRevenue += price;
          } else {
            byDate[dateKey].confirmedRevenue += price;
          }
          // Accumulate per-day category breakdown
          const category = (apt as any).service_category || getServiceCategory(apt.service_name);
          byDate[dateKey].categoryBreakdown[category] = (byDate[dateKey].categoryBreakdown[category] || 0) + price;
          
          byDate[dateKey].count += 1;
          byDate[dateKey].appointments.push({
            id: apt.id,
            client_name: apt.client_name,
            service_name: apt.service_name,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: apt.total_price,
            stylist_name: apt.phorest_staff_id ? staffMap[apt.phorest_staff_id] || null : null,
            location_id: (apt as any).location_id || null,
          });
        }
      });

      // Aggregate by service category
      const byCategory: Record<string, CategoryBreakdown> = {};
      appointments.forEach(apt => {
        const category = (apt as any).service_category || getServiceCategory(apt.service_name);
        const price = Number(apt.total_price) || 0;
        if (!byCategory[category]) {
          byCategory[category] = { revenue: 0, count: 0 };
        }
        byCategory[category].revenue += price;
        byCategory[category].count += 1;
      });

      // Fetch location names for byLocation breakdown
      const locationIds = [...new Set(appointments.map((a: any) => a.location_id).filter(Boolean))] as string[];
      const locationMap: Record<string, string> = {};
      if (locationIds.length > 0) {
        const { data: locData } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', locationIds);
        (locData || []).forEach((loc: { id: string; name: string }) => {
          locationMap[loc.id] = loc.name || 'Unknown';
        });
      }

      // Aggregate by location
      const byLocation: Record<string, CategoryBreakdown> = {};
      appointments.forEach((apt: any) => {
        const locId = apt.location_id;
        const key = locId ? (locationMap[locId] || locId) : 'No Location';
        const price = Number(apt.total_price) || 0;
        if (!byLocation[key]) {
          byLocation[key] = { revenue: 0, count: 0 };
        }
        byLocation[key].revenue += price;
        byLocation[key].count += 1;
      });

      // Aggregate by stylist (use staff name or fallback to ID)
      const byStylist: Record<string, CategoryBreakdown> = {};
      appointments.forEach((apt: any) => {
        const staffId = apt.phorest_staff_id;
        const key = staffId ? (staffMap[staffId] || `Staff ${staffId}`) : 'Unassigned';
        const price = Number(apt.total_price) || 0;
        if (!byStylist[key]) {
          byStylist[key] = { revenue: 0, count: 0 };
        }
        byStylist[key].revenue += price;
        byStylist[key].count += 1;
      });

      // Build days array
      const days: DayForecast[] = dates.map(d => ({
        date: d.date,
        dayName: d.dayName,
        revenue: byDate[d.date].revenue,
        confirmedRevenue: byDate[d.date].confirmedRevenue,
        unconfirmedRevenue: byDate[d.date].unconfirmedRevenue,
        appointmentCount: byDate[d.date].count,
        appointments: byDate[d.date].appointments,
        categoryBreakdown: byDate[d.date].categoryBreakdown,
      }));

      // Group days into weeks for 30/60 day views
      const weeks: WeekForecast[] = [];
      if (dayCount >= 30) {
        const weekMap = new Map<string, DayForecast[]>();
        
        days.forEach(day => {
          const dayDate = new Date(day.date + 'T00:00:00');
          const weekStart = startOfWeek(dayDate, { weekStartsOn: 1 }); // Monday
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          
          if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, []);
          }
          weekMap.get(weekKey)!.push(day);
        });

        // Convert to weeks array
        Array.from(weekMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([weekStartStr, weekDays]) => {
            const weekStartDate = new Date(weekStartStr + 'T00:00:00');
            const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
            
            // Aggregate category breakdowns across days in this week
            const weekCategoryBreakdown: Record<string, number> = {};
            weekDays.forEach(d => {
              Object.entries(d.categoryBreakdown).forEach(([cat, rev]) => {
                weekCategoryBreakdown[cat] = (weekCategoryBreakdown[cat] || 0) + rev;
              });
            });

            weeks.push({
              weekStart: weekStartStr,
              weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
              weekLabel: `Week of ${format(weekStartDate, 'MMM d')}`,
              revenue: weekDays.reduce((sum, d) => sum + d.revenue, 0),
              confirmedRevenue: weekDays.reduce((sum, d) => sum + d.confirmedRevenue, 0),
              unconfirmedRevenue: weekDays.reduce((sum, d) => sum + d.unconfirmedRevenue, 0),
              appointmentCount: weekDays.reduce((sum, d) => sum + d.appointmentCount, 0),
              days: weekDays,
              categoryBreakdown: weekCategoryBreakdown,
            });
          });
      }

      // Calculate totals
      const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
      const totalAppointments = days.reduce((sum, d) => sum + d.appointmentCount, 0);
      const averageDaily = dayCount > 0 ? totalRevenue / dayCount : 0;
      const averageWeekly = weeks.length > 0 ? totalRevenue / weeks.length : averageDaily * 7;
      
      // Find peak day
      const peakDay = days.reduce<DayForecast | null>((peak, day) => {
        if (!peak || day.revenue > peak.revenue) return day;
        return peak;
      }, null);

      // Find peak week
      const peakWeek = weeks.reduce<WeekForecast | null>((peak, week) => {
        if (!peak || week.revenue > peak.revenue) return week;
        return peak;
      }, null);

      return {
        days,
        weeks,
        totalRevenue,
        totalAppointments,
        averageDaily,
        averageWeekly,
        peakDay,
        peakWeek,
        byCategory,
        byLocation,
        byStylist,
      } as ForecastData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
