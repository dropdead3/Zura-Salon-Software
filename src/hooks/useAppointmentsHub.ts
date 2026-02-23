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
      // Build matching filters for both tables
      const buildFilters = (q: any, stylistCol: string) => {
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
        if (filters.stylistUserId) q = q.eq(stylistCol, filters.stylistUserId);
        if (filters.startDate) q = q.gte('appointment_date', filters.startDate);
        if (filters.endDate) q = q.lte('appointment_date', filters.endDate);
        if (filters.search) {
          const term = `%${filters.search}%`;
          q = q.or(`client_name.ilike.${term},client_phone.ilike.${term}`);
        }
        return q;
      };

      // Query both tables in parallel
      let phorestQuery = buildFilters(
        supabase.from('phorest_appointments').select('*', { count: 'exact' }),
        'stylist_user_id'
      );
      let localQuery = buildFilters(
        supabase.from('appointments').select('*', { count: 'exact' }),
        'staff_user_id'
      );

      const [phorestResult, localResult] = await Promise.all([
        phorestQuery.order('appointment_date', { ascending: false }).order('start_time', { ascending: false }).limit(1000),
        localQuery.order('appointment_date', { ascending: false }).order('start_time', { ascending: false }).limit(1000),
      ]);

      if (phorestResult.error) throw phorestResult.error;
      if (localResult.error) throw localResult.error;

      // Normalize local appointments to match phorest shape
      const normalizedLocal = (localResult.data || []).map((a: any) => ({
        ...a,
        stylist_user_id: a.staff_user_id,
        _source: 'local' as const,
      }));

      const normalizedPhorest = (phorestResult.data || []).map((a: any) => ({
        ...a,
        _source: 'phorest' as const,
      }));

      // Merge and sort
      const all = [...normalizedPhorest, ...normalizedLocal].sort((a, b) => {
        const dateCompare = (b.appointment_date || '').localeCompare(a.appointment_date || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.start_time || '').localeCompare(a.start_time || '');
      });

      const totalCount = (phorestResult.count || 0) + (localResult.count || 0);

      // Paginate merged results
      const from = page * pageSize;
      const paged = all.slice(from, from + pageSize);

      // Resolve stylist names
      const stylistIds = [...new Set(paged.map((a: any) => a.stylist_user_id).filter(Boolean))] as string[];
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

      const enriched = paged.map((a: any) => ({
        ...a,
        stylist_name: stylistMap[a.stylist_user_id] || a.staff_name || null,
      }));

      return {
        appointments: enriched,
        totalCount,
        page,
        pageSize,
      };
    },
    enabled: true,
    staleTime: 30_000,
  });
}
