import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { getServiceCategory } from '@/utils/serviceCategorization';

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

export interface CategoryBreakdown {
  revenue: number;
  count: number;
}

export interface WeekAheadData {
  days: DayForecast[];
  totalRevenue: number;
  totalAppointments: number;
  averageDaily: number;
  peakDay: DayForecast | null;
  byCategory: Record<string, CategoryBreakdown>;
}

export function useWeekAheadRevenue(locationId?: string) {
  const today = new Date();
  
  // Generate date range for next 7 days (starting tomorrow)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i + 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE'),
    };
  });

  const startDate = dates[0].date;
  const endDate = dates[6].date;

  return useQuery({
    queryKey: ['week-ahead-revenue', startDate, endDate, locationId],
    queryFn: async () => {
      let query = supabase
        .from('phorest_appointments')
        .select('id, appointment_date, total_price, status, client_name, service_name, start_time, end_time, phorest_staff_id, service_category, location_id')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .not('status', 'in', '("cancelled","no_show")')
        .order('start_time', { ascending: true });

      // Filter by location(s) - supports comma-separated multi-select
      if (locationId && locationId !== 'all') {
        const ids = locationId.split(',').filter(Boolean);
        if (ids.length === 1) {
          query = query.eq('location_id', ids[0]);
        } else if (ids.length > 1) {
          query = query.in('location_id', ids);
        }
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

      // Calculate totals
      const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
      const totalAppointments = days.reduce((sum, d) => sum + d.appointmentCount, 0);
      const averageDaily = totalRevenue / 7;
      
      // Find peak day
      const peakDay = days.reduce<DayForecast | null>((peak, day) => {
        if (!peak || day.revenue > peak.revenue) return day;
        return peak;
      }, null);

      return {
        days,
        totalRevenue,
        totalAppointments,
        averageDaily,
        peakDay,
        byCategory,
      } as WeekAheadData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
