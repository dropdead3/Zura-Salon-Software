import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
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

      // Query both tables in parallel (exclude soft-deleted)
      let phorestQuery = buildFilters(
        supabase.from('phorest_appointments').select('*', { count: 'exact' }).is('deleted_at', null),
        'stylist_user_id'
      );
      let localQuery = buildFilters(
        supabase.from('appointments').select('*', { count: 'exact' }).is('deleted_at', null),
        'staff_user_id'
      );

      // Get exact counts first
      const [phorestCountRes, localCountRes] = await Promise.all([
        buildFilters(
          supabase.from('phorest_appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          'stylist_user_id'
        ),
        buildFilters(
          supabase.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          'staff_user_id'
        ),
      ]);

      const phorestCount = phorestCountRes.count || 0;
      const localCount = localCountRes.count || 0;
      const totalCount = phorestCount + localCount;

      // Server-side pagination: fetch only the page we need from each source
      // Strategy: prioritize phorest rows (sorted desc), then local rows
      const rangeFrom = page * pageSize;
      const rangeTo = rangeFrom + pageSize - 1;

      let phorestData: any[] = [];
      let localData: any[] = [];

      if (rangeFrom < phorestCount) {
        // Some or all rows come from phorest
        const phorestEnd = Math.min(rangeTo, phorestCount - 1);
        const { data, error } = await phorestQuery
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(rangeFrom, phorestEnd);
        if (error) throw error;
        phorestData = data || [];

        // If we need more rows from local to fill the page
        const remaining = pageSize - phorestData.length;
        if (remaining > 0) {
          const { data: ld, error: le } = await localQuery
            .order('appointment_date', { ascending: false })
            .order('start_time', { ascending: false })
            .range(0, remaining - 1);
          if (le) throw le;
          localData = ld || [];
        }
      } else {
        // All rows come from local
        const localFrom = rangeFrom - phorestCount;
        const localTo = localFrom + pageSize - 1;
        const { data, error } = await localQuery
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(localFrom, localTo);
        if (error) throw error;
        localData = data || [];
      }

      // Normalize
      const normalizedLocal = localData.map((a: any) => ({
        ...a,
        stylist_user_id: a.staff_user_id,
        _source: 'local' as const,
      }));

      const normalizedPhorest = phorestData.map((a: any) => ({
        ...a,
        _source: 'phorest' as const,
      }));

      const paged = [...normalizedPhorest, ...normalizedLocal];

      // ── Resolve client info (name, email, phone) from phorest_clients ──
      const missingClientIds = [
        ...new Set(
          paged
            .filter((a: any) => a.phorest_client_id)
            .map((a: any) => a.phorest_client_id)
        ),
      ] as string[];

      let clientInfoMap: Record<string, { name?: string; email?: string; phone?: string; customer_number?: string }> = {};
      if (missingClientIds.length > 0) {
        const { data: clients } = await supabase
          .from('v_all_clients')
          .select('phorest_client_id, name, email, phone, customer_number')
          .in('phorest_client_id', missingClientIds);
        for (const c of clients || []) {
          if (c.phorest_client_id) {
            clientInfoMap[c.phorest_client_id] = {
              name: c.name || undefined,
              email: c.email || undefined,
              phone: c.phone || undefined,
              customer_number: (c as any).customer_number || undefined,
            };
          }
        }
      }

      // ── Resolve stylist names ──
      const stylistIds = [...new Set(paged.map((a: any) => a.stylist_user_id).filter(Boolean))] as string[];
      let stylistMap: Record<string, string> = {};
      if (stylistIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', stylistIds);
        for (const p of profiles || []) {
          stylistMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
        }
      }

      // ── Resolve created_by names ──
      const createdByIds = [...new Set(paged.map((a: any) => a.created_by).filter(Boolean))] as string[];
      let createdByMap: Record<string, string> = {};
      if (createdByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', createdByIds);
        for (const p of profiles || []) {
          createdByMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
        }
      }

      // ── Resolve location names ──
      const locationIds = [...new Set(paged.map((a: any) => a.location_id).filter(Boolean))] as string[];
      let locationMap: Record<string, string> = {};
      if (locationIds.length > 0) {
        const { data: locs } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', locationIds);
        for (const l of locs || []) {
          locationMap[l.id] = l.name;
        }
      }

      // ── Resolve customer_number for local appointments ──
      const localClientIds = [...new Set(paged.filter((a: any) => a._source === 'local' && a.client_id).map((a: any) => a.client_id))] as string[];
      let localClientMap: Record<string, string> = {};
      if (localClientIds.length > 0) {
        const { data: localClients } = await supabase
          .from('clients')
          .select('id, customer_number')
          .in('id', localClientIds);
        for (const c of localClients || []) {
          if ((c as any).customer_number) localClientMap[c.id] = (c as any).customer_number;
        }
      }

      // ── Check which appointments have matching transactions ──
      const phorestClientIdsForTx = [
        ...new Set(
          paged
            .filter((a: any) => a.phorest_client_id && a.appointment_date)
            .map((a: any) => a.phorest_client_id)
        ),
      ] as string[];
      const appointmentDates = [...new Set(paged.map((a: any) => a.appointment_date).filter(Boolean))] as string[];

      let transactionClientIds = new Set<string>();
      const transactionTotalMap: Record<string, number> = {};
      if (phorestClientIdsForTx.length > 0 && appointmentDates.length > 0) {
        const { data: txMatches } = await supabase
          .from('v_all_transaction_items')
          .select('phorest_client_id, transaction_date, total_amount')
          .in('phorest_client_id', phorestClientIdsForTx)
          .in('transaction_date', appointmentDates);
        txMatches?.forEach((t: any) => {
          if (t.phorest_client_id) {
            transactionClientIds.add(t.phorest_client_id);
            const key = `${t.phorest_client_id}|${t.transaction_date}`;
            transactionTotalMap[key] = (transactionTotalMap[key] || 0) + (Number(t.total_amount) || 0);
          }
        });
      }

      // ── Enrich ──
      const enriched = paged.map((a: any) => {
        const clientInfo = clientInfoMap[a.phorest_client_id] || {};
        const customerNumber = a._source === 'phorest'
          ? (clientInfo.customer_number || null)
          : (a.client_id ? localClientMap[a.client_id] || null : null);
        return {
          ...a,
          client_name: a.client_name || clientInfo.name || null,
          client_email: a.client_email || clientInfo.email || null,
          client_phone: a.client_phone || clientInfo.phone || null,
          customer_number: customerNumber,
          stylist_name: stylistMap[a.stylist_user_id] || a.staff_name || null,
          created_by_name: a.created_by
            ? createdByMap[a.created_by] || 'Unknown'
            : a._source === 'phorest'
              ? 'Phorest Sync'
              : null,
          location_name: locationMap[a.location_id] || null,
          has_transaction: a.phorest_client_id ? transactionClientIds.has(a.phorest_client_id) : false,
          total_paid: a.phorest_client_id && a.appointment_date
            ? transactionTotalMap[`${a.phorest_client_id}|${a.appointment_date}`] ?? null
            : null,
        };
      });

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
