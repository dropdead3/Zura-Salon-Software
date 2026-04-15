import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import type { DateRangeType } from '@/components/dashboard/PinnedAnalyticsCard';

export interface LocationBreakdown {
  locationId: string;
  name: string;
  count: number;
}

function getDateBounds(dateRange: DateRangeType | undefined): { startDate: string; endDate: string } {
  const today = new Date();
  
  // Returns ISO timestamp bounds (start-of-day and end-of-day) for created_at filtering
  const toStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
  const toEndOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

  switch (dateRange) {
    case 'yesterday': {
      const y = subDays(today, 1);
      return { startDate: toStartOfDay(y), endDate: toEndOfDay(y) };
    }
    case '7d':
      return { startDate: toStartOfDay(subDays(today, 6)), endDate: toEndOfDay(today) };
    case '30d':
      return { startDate: toStartOfDay(subDays(today, 29)), endDate: toEndOfDay(today) };
    case 'thisWeek':
      return { startDate: toStartOfDay(startOfWeek(today, { weekStartsOn: 1 })), endDate: toEndOfDay(today) };
    case 'thisMonth':
      return { startDate: toStartOfDay(startOfMonth(today)), endDate: toEndOfDay(today) };
    case 'lastMonth': {
      const lm = subMonths(today, 1);
      return { startDate: toStartOfDay(startOfMonth(lm)), endDate: toEndOfDay(endOfMonth(lm)) };
    }
    case 'todayToEom':
      return { startDate: toStartOfDay(today), endDate: toEndOfDay(endOfMonth(today)) };
    case 'todayToPayday': {
      const day = today.getDate();
      let payday: Date;
      if (day < 15) {
        payday = new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        payday = endOfMonth(today);
      }
      return { startDate: toStartOfDay(today), endDate: toEndOfDay(payday) };
    }
    case 'today':
    default:
      return { startDate: toStartOfDay(today), endDate: toEndOfDay(today) };
  }
}

export interface StaffBreakdownNew {
  phorestStaffId: string;
  staffName: string;
  count: number;
  sharePercent: number;
}

export interface StaffBreakdownReturning {
  phorestStaffId: string;
  staffName: string;
  uniqueClients: number;
  rebookedCount: number;
  rebookRate: number;
}

export function useNewBookings(locationId?: string, dateRange?: DateRangeType) {
  const { startDate, endDate } = getDateBounds(dateRange);
  

  return useQuery({
    queryKey: ['new-bookings', startDate, endDate, locationId || 'all'],
    queryFn: async () => {
      // Fetch locations for name lookup
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true);

      const locationLookup: Record<string, string> = {};
      locations?.forEach(loc => {
        locationLookup[loc.id] = loc.name;
      });

      // Fetch staff mappings for name resolution
      const { data: staffMappings } = await supabase
        .from('v_all_staff' as any)
        .select(`
          phorest_staff_id,
          user_id,
          employee_profiles:user_id (
            full_name,
            display_name
          )
        `)
        .eq('is_active', true);

      const staffLookup: Record<string, string> = {};
      staffMappings?.forEach(m => {
        const profile = m.employee_profiles as any;
        staffLookup[m.phorest_staff_id] = profile ? formatDisplayName(profile.full_name || '', profile.display_name) : 'Unknown';
      });

      // Helper to apply location filter
      const applyLocFilter = (q: any) => {
        if (locationId && locationId !== 'all') {
          return q.eq('location_id', locationId);
        }
        return q;
      };

      // Fetch appointments in the selected range (by created_at)
      const rangeBookings = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('id, total_price, tip_amount, appointment_date, phorest_client_id, phorest_staff_id, location_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .not('status', 'eq', 'cancelled')
          .range(from, to);
        if (locationId && locationId !== 'all') {
          q = q.eq('location_id', locationId);
        }
        return q;
      });

      // Determine truly new clients: clients whose first-ever appointment falls within the range
      const rangeClientIdSet = new Set<string>();
      (rangeBookings || []).forEach(a => {
        if (a.phorest_client_id) rangeClientIdSet.add(a.phorest_client_id as string);
      });
      const rangeClientIds = Array.from(rangeClientIdSet);

      const newClientPhorestIds = new Set<string>();
      if (rangeClientIds.length > 0) {
        // Batch check: for each client, see if they have any appointment before startDate
        const priorAppts = await fetchAllBatched<{ phorest_client_id: string | null }>((from, to) =>
          supabase
            .from('v_all_appointments' as any)
            .select('phorest_client_id')
            .in('phorest_client_id', rangeClientIds as readonly string[])
            .lt('appointment_date', startDate)
            .not('status', 'eq', 'cancelled')
            .range(from, to)
        );

        const clientsWithPriorVisit = new Set(
          priorAppts.map(a => a.phorest_client_id as string)
        );

        for (const cid of rangeClientIds) {
          if (!clientsWithPriorVisit.has(cid)) {
            newClientPhorestIds.add(cid);
          }
        }
      }

      // 30-day comparison (always relative to today for long-term context)
      const now = new Date();
      const thirtyDaysAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const sixtyDaysAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59, 0, 0, 0).toISOString();
      const thirtyOneDaysAgoEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 23, 59, 59, 999).toISOString();

      // Use count-only queries for 30-day comparisons (avoids pagination entirely)
      const [last30Res, prev30Res] = await Promise.all([
        applyLocFilter(
          supabase
            .from('v_all_appointments' as any)
            .select('id', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgoStart)
            .lte('created_at', todayEnd)
            .not('status', 'eq', 'cancelled')
        ),
        applyLocFilter(
          supabase
            .from('v_all_appointments' as any)
            .select('id', { count: 'exact', head: true })
            .gte('created_at', sixtyDaysAgoStart)
            .lte('created_at', thirtyOneDaysAgoEnd)
            .not('status', 'eq', 'cancelled')
        ),
      ]);
      if (last30Res.error) throw last30Res.error;
      if (prev30Res.error) throw prev30Res.error;

      // Rebook rate: returning clients within range who have a future appointment
      // For rebook rate: use the already-fetched range bookings, filter to returning clients only
      const returningRebookAppts = (rangeBookings || []).filter(
        a => a.phorest_client_id && !newClientPhorestIds.has(a.phorest_client_id)
      );
      // Count unique returning clients (not appointments) for accurate rebook denominator
      const returningClientSet = new Set(
        returningRebookAppts.map(a => a.phorest_client_id as string)
      );
      const returningServicedInRange = returningClientSet.size;

      let rebookedAtCheckoutInRange = 0;
      const rebookClientIds = [...returningClientSet];

      if (rebookClientIds.length > 0) {
        const { data: futureAppts, error: futureError } = await supabase
          .from('v_all_appointments' as any)
          .select('phorest_client_id')
          .in('phorest_client_id', rebookClientIds as readonly string[])
          .gt('appointment_date', endDate)
          .not('status', 'eq', 'cancelled');
        if (futureError) throw futureError;

        const clientsWithFuture = new Set(
          (futureAppts || []).map(a => a.phorest_client_id as string)
        );

        rebookedAtCheckoutInRange = [...returningClientSet].filter((cid: string) => clientsWithFuture.has(cid)).length;
      }

      const rebookRate = returningServicedInRange > 0
        ? Math.round((rebookedAtCheckoutInRange / returningServicedInRange) * 100)
        : null;

      const booked = rangeBookings;
      const newClientCount = booked.filter(apt => apt.phorest_client_id && newClientPhorestIds.has(apt.phorest_client_id)).length;
      const returningClientCount = booked.length - newClientCount;

      // Location breakdown
      const byLocation: Record<string, { name: string; count: number }> = {};
      booked.forEach(apt => {
        const locId = apt.location_id || 'unknown';
        if (!byLocation[locId]) {
          byLocation[locId] = { name: locationLookup[locId] || 'Unknown', count: 0 };
        }
        byLocation[locId].count += 1;
      });

      const locationBreakdown: LocationBreakdown[] = Object.entries(byLocation)
        .map(([id, data]) => ({ locationId: id, ...data }))
        .sort((a, b) => b.count - a.count);

      // 30-day comparison (count-only queries)
      const last30Count = last30Res.count || 0;
      const prev30Count = prev30Res.count || 0;
      const percentChange = prev30Count > 0
        ? Math.round(((last30Count - prev30Count) / prev30Count) * 100)
        : 0;

      // Staff-level breakdown: New Clients
      const newClientAppts = booked.filter(apt => apt.phorest_client_id && newClientPhorestIds.has(apt.phorest_client_id));
      const newByStaffMap: Record<string, number> = {};
      newClientAppts.forEach(apt => {
        const sid = (apt as any).phorest_staff_id;
        if (sid) newByStaffMap[sid] = (newByStaffMap[sid] || 0) + 1;
      });
      const totalNew = newClientAppts.length || 1;
      const newClientsByStaff: StaffBreakdownNew[] = Object.entries(newByStaffMap)
        .map(([phorestStaffId, count]) => ({
          phorestStaffId,
          staffName: staffLookup[phorestStaffId] || 'Unknown',
          count,
          sharePercent: Math.round((count / totalNew) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Staff-level breakdown: Returning Clients with rebook
      const returningByStaffMap: Record<string, Set<string>> = {};
      returningRebookAppts.forEach(apt => {
        const sid = (apt as any).phorest_staff_id;
        if (sid && apt.phorest_client_id) {
          if (!returningByStaffMap[sid]) returningByStaffMap[sid] = new Set();
          returningByStaffMap[sid].add(apt.phorest_client_id as string);
        }
      });

      // For rebook per stylist, check which of their returning clients have future appts
      let futureClientSet = new Set<string>();
      if (rebookClientIds.length > 0) {
        const { data: futureAppts2 } = await supabase
          .from('v_all_appointments' as any)
          .select('phorest_client_id')
          .in('phorest_client_id', rebookClientIds as readonly string[])
          .gt('appointment_date', endDate)
          .not('status', 'eq', 'cancelled');
        futureClientSet = new Set((futureAppts2 || []).map(a => a.phorest_client_id as string));
      }

      const returningClientsByStaff: StaffBreakdownReturning[] = Object.entries(returningByStaffMap)
        .map(([phorestStaffId, clientSet]) => {
          const uniqueClients = clientSet.size;
          const rebookedCount = [...clientSet].filter(cid => futureClientSet.has(cid)).length;
          return {
            phorestStaffId,
            staffName: staffLookup[phorestStaffId] || 'Unknown',
            uniqueClients,
            rebookedCount,
            rebookRate: uniqueClients > 0 ? Math.round((rebookedCount / uniqueClients) * 100) : 0,
          };
        })
        .sort((a, b) => b.uniqueClients - a.uniqueClients);

      return {
        bookedInRange: booked.length,
        bookedInRangeRevenue: booked.reduce((sum, apt) => sum + ((Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0)), 0),
        newClientCount,
        returningClientCount,
        last30Days: last30Count,
        prev30Days: prev30Count,
        percentChange,
        locationBreakdown,
        returningServicedInRange,
        rebookedAtCheckoutInRange,
        rebookRate,
        newClientsByStaff,
        returningClientsByStaff,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
