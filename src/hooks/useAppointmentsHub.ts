import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HubFilters {
  search?: string;
  status?: string;
  stylistUserId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export function useAppointmentsHub(filters: HubFilters) {
  const page = filters.page || 0;
  const pageSize = filters.pageSize || 50;

  return useQuery({
    queryKey: ['appointments-hub', filters],
    queryFn: async () => {
      let query = supabase
        .from('phorest_appointments')
        .select('*', { count: 'exact' });

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.stylistUserId) {
        query = query.eq('stylist_user_id', filters.stylistUserId);
      }

      if (filters.startDate) {
        query = query.gte('appointment_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('appointment_date', filters.endDate);
      }

      // Search across client_name and phone
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`client_name.ilike.${term},client_phone.ilike.${term}`);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // Resolve stylist names from stylist_user_id
      const stylistIds = [...new Set((data || []).map((a: any) => a.stylist_user_id).filter(Boolean))] as string[];
      let stylistMap: Record<string, string> = {};
      if (stylistIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', stylistIds);
        for (const p of profiles || []) {
          stylistMap[p.user_id] = p.display_name || p.full_name || 'Unknown';
        }
      }

      const enriched = (data || []).map((a: any) => ({
        ...a,
        stylist_name: stylistMap[a.stylist_user_id] || null,
      }));

      return {
        appointments: enriched,
        totalCount: count || 0,
        page,
        pageSize,
      };
    },
    enabled: true,
    staleTime: 30_000,
  });
}
