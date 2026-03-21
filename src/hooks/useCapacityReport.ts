import { useQuery } from '@tanstack/react-query';
import { getDay, getHours, format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface HourData {
  hour: string;
  appointments: number;
  utilization: number;
}

interface CapacityData {
  totalAppointments: number;
  totalBookedHours: number;
  avgUtilization: number;
  peakHour: string;
  busiestDay: string;
  byHour: HourData[];
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useCapacityReport(dateFrom: string, dateTo: string, locationId?: string) {
  return useQuery({
    queryKey: ['capacity-report', dateFrom, dateTo, locationId],
    queryFn: async (): Promise<CapacityData> => {
      let query = supabase
        .from('phorest_appointments')
        .select('id, appointment_date, start_time, end_time, status')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)
        .not('status', 'in', '("cancelled","no_show")');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data: appointments, error } = await query;
      
      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        return {
          totalAppointments: 0,
          totalBookedHours: 0,
          avgUtilization: 0,
          peakHour: 'N/A',
          busiestDay: 'N/A',
          byHour: [],
        };
      }

      // Calculate total booked hours
      let totalMinutes = 0;
      appointments.forEach(apt => {
        if (apt.start_time && apt.end_time) {
          const start = new Date(`${apt.appointment_date}T${apt.start_time}`);
          const end = new Date(`${apt.appointment_date}T${apt.end_time}`);
          totalMinutes += differenceInMinutes(end, start);
        }
      });

      // Group by hour
      const byHourCount: Record<number, number> = {};
      
      appointments.forEach(apt => {
        if (apt.start_time) {
          const hour = parseInt(apt.start_time.split(':')[0]);
          byHourCount[hour] = (byHourCount[hour] || 0) + 1;
        }
      });

      // Find peak hour
      let peakHour = 9;
      let maxCount = 0;
      Object.entries(byHourCount).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          peakHour = parseInt(hour);
        }
      });

      // Group by day
      const byDayCount: Record<number, number> = {};
      appointments.forEach(apt => {
        const dayOfWeek = getDay(new Date(apt.appointment_date));
        byDayCount[dayOfWeek] = (byDayCount[dayOfWeek] || 0) + 1;
      });

      // Find busiest day
      let busiestDay = 1;
      let maxDayCount = 0;
      Object.entries(byDayCount).forEach(([day, count]) => {
        if (count > maxDayCount) {
          maxDayCount = count;
          busiestDay = parseInt(day);
        }
      });

      // Calculate utilization by hour (assuming 8 working hours per day, 6 days a week)
      const workingDays = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24));
      const maxAppointmentsPerHour = workingDays; // Simplified: 1 stylist capacity

      const byHour: HourData[] = [];
      for (let h = 8; h <= 20; h++) {
        const count = byHourCount[h] || 0;
        byHour.push({
          hour: `${h.toString().padStart(2, '0')}:00`,
          appointments: count,
          utilization: maxAppointmentsPerHour > 0 ? (count / maxAppointmentsPerHour) * 100 : 0,
        });
      }

      return {
        totalAppointments: appointments.length,
        totalBookedHours: totalMinutes / 60,
        avgUtilization: appointments.length > 0 ? (appointments.length / (workingDays * 8)) * 100 : 0,
        peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
        busiestDay: dayNames[busiestDay],
        byHour,
      };
    },
  });
}
