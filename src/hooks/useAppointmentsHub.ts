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

// Narrow column list — only fields the table actually renders.
// Drops payload size materially vs SELECT *.
// NOTE: v_all_appointments does NOT expose client_id, client_email, or created_by.
// Those live on the underlying `appointments` table only. Keep this list in sync with
// the actual view schema — including a non-existent column 400s the entire query.
const APPT_COLUMNS = [
  'id',
  'source',
  'deleted_at',
  'appointment_date',
  'start_time',
  'end_time',
  'client_name',
  'client_phone',
  'phorest_client_id',
  'service_name',
  'stylist_user_id',
  'staff_name',
  'status',
  'total_price',
  'location_id',
  'created_at',
].join(',');

export function useAppointmentsHub(filters: HubFilters, options: { enabled?: boolean } = {}) {
  const page = filters.page || 0;
  const pageSize = filters.pageSize || 50;
  const enabled = options.enabled !== false;

  return useQuery({
    queryKey: ['appointments-hub', filters],
    queryFn: async () => {
      // Use 'estimated' count by default — avoids full filtered scan on every page.
      // Use 'exact' only when the user has narrowed the result set materially.
      const hasNarrowFilter = !!(
        filters.search ||
        (filters.status && filters.status !== 'all') ||
        filters.stylistUserId ||
        filters.startDate ||
        filters.endDate
      );
      const countMode: 'exact' | 'estimated' = hasNarrowFilter ? 'exact' : 'estimated';

      let q = supabase
        .from('v_all_appointments' as any)
        .select(APPT_COLUMNS, { count: countMode })
        .is('deleted_at', null);

      if (filters.locationId) q = q.eq('location_id', filters.locationId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.stylistUserId) q = q.eq('stylist_user_id', filters.stylistUserId);
      if (filters.startDate) q = q.gte('appointment_date', filters.startDate);
      if (filters.endDate) q = q.lte('appointment_date', filters.endDate);
      if (filters.search) {
        const term = `%${filters.search}%`;
        q = q.or(`client_name.ilike.${term},client_phone.ilike.${term}`);
      }

      const rangeFrom = page * pageSize;
      const rangeTo = rangeFrom + pageSize - 1;

      const { data, count, error } = await q
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (error) throw error;

      const paged = (data || []) as any[];
      const totalCount = count || 0;

      // ── Collect ID buckets ──
      const phorestClientIds = [
        ...new Set(paged.filter((a: any) => a.phorest_client_id).map((a: any) => a.phorest_client_id)),
      ] as string[];
      const stylistIds = [...new Set(paged.map((a: any) => a.stylist_user_id).filter(Boolean))] as string[];
      const createdByIds = [...new Set(paged.map((a: any) => a.created_by).filter(Boolean))] as string[];
      const locationIds = [...new Set(paged.map((a: any) => a.location_id).filter(Boolean))] as string[];
      const localClientIds = [
        ...new Set(paged.filter((a: any) => a.source === 'local' && a.client_id).map((a: any) => a.client_id)),
      ] as string[];
      const appointmentDates = [...new Set(paged.map((a: any) => a.appointment_date).filter(Boolean))] as string[];

      // Combine stylist + created_by IDs for a single profile lookup
      const allProfileIds = [...new Set([...stylistIds, ...createdByIds])];

      // ── Run all enrichment lookups in parallel ──
      const [
        clientsRes,
        profilesRes,
        locationsRes,
        localClientsRes,
        txMatchesRes,
      ] = await Promise.all([
        phorestClientIds.length > 0
          ? supabase
              .from('v_all_clients' as any)
              .select('phorest_client_id, name, email, phone, customer_number')
              .in('phorest_client_id', phorestClientIds)
          : Promise.resolve({ data: [] as any[] }),
        allProfileIds.length > 0
          ? supabase
              .from('employee_profiles')
              .select('user_id, display_name, full_name')
              .in('user_id', allProfileIds)
          : Promise.resolve({ data: [] as any[] }),
        locationIds.length > 0
          ? supabase.from('locations').select('id, name').in('id', locationIds)
          : Promise.resolve({ data: [] as any[] }),
        localClientIds.length > 0
          ? supabase.from('clients').select('id, customer_number').in('id', localClientIds)
          : Promise.resolve({ data: [] as any[] }),
        phorestClientIds.length > 0 && appointmentDates.length > 0
          ? supabase
              .from('v_all_transaction_items' as any)
              .select('phorest_client_id, transaction_date, total_amount')
              .in('phorest_client_id', phorestClientIds)
              .in('transaction_date', appointmentDates)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // ── Build lookup maps ──
      const clientInfoMap: Record<string, { name?: string; email?: string; phone?: string; customer_number?: string }> = {};
      for (const c of (clientsRes.data || []) as any[]) {
        if (c.phorest_client_id) {
          clientInfoMap[c.phorest_client_id] = {
            name: c.name || undefined,
            email: c.email || undefined,
            phone: c.phone || undefined,
            customer_number: c.customer_number || undefined,
          };
        }
      }

      const profileMap: Record<string, string> = {};
      for (const p of (profilesRes.data || []) as any[]) {
        profileMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
      }

      const locationMap: Record<string, string> = {};
      for (const l of (locationsRes.data || []) as any[]) {
        locationMap[l.id] = l.name;
      }

      const localClientMap: Record<string, string> = {};
      for (const c of (localClientsRes.data || []) as any[]) {
        if (c.customer_number) localClientMap[c.id] = c.customer_number;
      }

      const transactionClientIds = new Set<string>();
      const transactionTotalMap: Record<string, number> = {};
      ((txMatchesRes.data || []) as any[]).forEach((t: any) => {
        if (t.phorest_client_id) {
          transactionClientIds.add(t.phorest_client_id);
          const key = `${t.phorest_client_id}|${t.transaction_date}`;
          transactionTotalMap[key] = (transactionTotalMap[key] || 0) + (Number(t.total_amount) || 0);
        }
      });

      // ── Enrich ──
      const enriched = paged.map((a: any) => {
        const clientInfo = clientInfoMap[a.phorest_client_id] || {};
        const customerNumber = a.source === 'phorest'
          ? (clientInfo.customer_number || null)
          : (a.client_id ? localClientMap[a.client_id] || null : null);
        return {
          ...a,
          client_name: a.client_name || clientInfo.name || null,
          client_email: a.client_email || clientInfo.email || null,
          client_phone: a.client_phone || clientInfo.phone || null,
          customer_number: customerNumber,
          stylist_name: profileMap[a.stylist_user_id] || a.staff_name || null,
          created_by_name: a.created_by
            ? profileMap[a.created_by] || 'Unknown'
            : a.source === 'phorest'
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
    enabled,
    staleTime: 60_000,
  });
}
