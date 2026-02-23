import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

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
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const page = filters.page || 0;
  const pageSize = filters.pageSize || 50;

  return useQuery({
    queryKey: ['appointments-hub', orgId, filters],
    queryFn: async () => {
      // Build query
      let query = supabase
        .from('phorest_appointments')
        .select('*, phorest_clients!phorest_appointments_phorest_client_id_fkey(name, email, phone)', { count: 'exact' });

      // Location filter for org scoping
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

      // Search across client_name, or joined client email/phone
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`client_name.ilike.${term},client_phone.ilike.${term}`);
      }

      // Pagination + ordering
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        appointments: data || [],
        totalCount: count || 0,
        page,
        pageSize,
      };
    },
    enabled: true,
    staleTime: 30_000,
  });
}
