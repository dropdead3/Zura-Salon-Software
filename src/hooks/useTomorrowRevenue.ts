import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { applyLocationFilter, isAllLocations } from '@/lib/locationFilter';

export function useTomorrowRevenue(locationId?: string) {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['tomorrow-revenue', tomorrowStr, locationId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('phorest_appointments')
        .select('total_price, status')
        .eq('appointment_date', tomorrowStr)
        .not('status', 'in', '("cancelled","no_show")');

      query = applyLocationFilter(query, locationId);

      const { data, error } = await query;

      if (error) throw error;

      const appointments = data || [];
      const totalRevenue = appointments.reduce(
        (sum, apt) => sum + (Number(apt.total_price) || 0), 
        0
      );

      return {
        revenue: totalRevenue,
        appointmentCount: appointments.length,
        date: tomorrowStr,
      };
    },
  });
}
