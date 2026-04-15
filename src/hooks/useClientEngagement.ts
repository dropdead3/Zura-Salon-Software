import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { resolveStaffNames } from '@/utils/resolveStaffNames';

// ── Types ──────────────────────────────────────────────────────

interface StaffVisitDetail {
  staffId: string;
  staffName: string;
  userId: string | null;
  totalVisits: number;
  newClientVisits: number;
  returningClientVisits: number;
  avgTicket: number;
  topServices: { name: string; count: number }[];
}

interface StaffRetentionDetail {
  staffId: string;
  staffName: string;
  userId: string | null;
  totalVisits: number;
  newClientVisits: number;
  returningClientVisits: number;
  returningRate: number;
  avgTicket: number;
}

interface StaffRebookingDetail {
  staffId: string;
  staffName: string;
  userId: string | null;
  totalAppointments: number;
  rebookedCount: number;
  rebookingRate: number;
  avgTicketRebooked: number;
  avgTicketNotRebooked: number;
}

export interface ClientEngagementData {
  visits: {
    total: number;
    priorTotal: number;
    percentChange: number | null;
    staffBreakdown: StaffVisitDetail[];
  };
  retention: {
    overallRate: number;
    priorRate: number;
    percentChange: number | null;
    staffBreakdown: StaffRetentionDetail[];
  };
  rebooking: {
    overallRate: number;
    priorRate: number;
    percentChange: number | null;
    staffBreakdown: StaffRebookingDetail[];
  };
  avgTicket: {
    current: number;
    prior: number;
    percentChange: number | null;
  };
  hasNames: boolean;
}

// ── Paginated fetch ────────────────────────────────────────────

async function fetchAppointments(
  dateFrom: string,
  dateTo: string,
  locationId?: string,
  fields = 'phorest_staff_id, is_new_client, rebooked_at_checkout, total_price, tip_amount, service_name, status'
) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('v_all_appointments' as any)
      .select(fields)
      .gte('appointment_date', dateFrom)
      .lte('appointment_date', dateTo)
      .not('status', 'in', '("cancelled","no_show")')
      .eq('is_demo', false)
      .range(from, from + PAGE_SIZE - 1);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    allData = allData.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allData;
}

// ── Hook ───────────────────────────────────────────────────────

export function useClientEngagement(
  dateFrom: string,
  dateTo: string,
  locationId?: string
) {
  return useQuery<ClientEngagementData>({
    queryKey: ['client-engagement', dateFrom, dateTo, locationId],
    queryFn: async () => {
      // Prior period calculation
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const durationMs = to.getTime() - from.getTime();
      const priorFrom = new Date(from.getTime() - durationMs - 86400000);
      const priorTo = new Date(from.getTime() - 86400000);
      const priorFromStr = priorFrom.toISOString().split('T')[0];
      const priorToStr = priorTo.toISOString().split('T')[0];

      // Fetch all staff mappings for userId cross-ref
      const { data: rawMappings } = await supabase
        .from('v_all_staff' as any)
        .select('phorest_staff_id, user_id');

      const allMappings = (rawMappings as any[]) || [];
      const allPhorestIds = allMappings.map((m: any) => m.phorest_staff_id);
      const staffNames = await resolveStaffNames(allPhorestIds);

      const mappingLookup: Record<string, { userId: string | null; name: string }> = {};
      let resolvedNameCount = 0;
      allMappings.forEach((m: any) => {
        const name = staffNames.byPhorestId[m.phorest_staff_id] || '';
        if (name) resolvedNameCount++;
        mappingLookup[m.phorest_staff_id] = {
          userId: m.user_id,
          name,
        };
      });

      // Fetch current and prior data in ONE pass each (all fields combined)
      const [currentAppts, priorAppts] = await Promise.all([
        fetchAppointments(dateFrom, dateTo, locationId),
        fetchAppointments(priorFromStr, priorToStr, locationId, 'phorest_staff_id, is_new_client, rebooked_at_checkout, total_price, tip_amount, status'),
      ]);

      const resolveName = (staffId: string) => {
        const mapped = mappingLookup[staffId];
        if (mapped?.name) return mapped.name;
        // Return raw ID — card component will apply Stylist N fallback
        return staffId;
      };

      const hasNames = resolvedNameCount > 0;

      // ── Build staff aggregates ──
      const staffMap: Record<string, {
        visits: number;
        newClients: number;
        revenue: number;
        services: Record<string, number>;
        rebooked: number;
        revenueRebooked: number;
        revenueNotRebooked: number;
      }> = {};

      currentAppts.forEach(apt => {
        const staffId = apt.phorest_staff_id;
        if (!staffId) return;

        if (!staffMap[staffId]) {
          staffMap[staffId] = {
            visits: 0, newClients: 0, revenue: 0, services: {},
            rebooked: 0, revenueRebooked: 0, revenueNotRebooked: 0,
          };
        }

        const e = staffMap[staffId];
        e.visits += 1;
        if (apt.is_new_client === true) e.newClients += 1;
        const price = (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);
        e.revenue += price;

        if (apt.service_name) {
          e.services[apt.service_name] = (e.services[apt.service_name] || 0) + 1;
        }

        if (apt.rebooked_at_checkout === true) {
          e.rebooked += 1;
          e.revenueRebooked += price;
        } else {
          e.revenueNotRebooked += price;
        }
      });

      // ── VISITS ──
      const totalVisits = currentAppts.length;
      const priorTotalVisits = priorAppts.length;
      const visitsPercentChange = priorTotalVisits > 0
        ? ((totalVisits - priorTotalVisits) / priorTotalVisits) * 100
        : null;

      const visitsBreakdown: StaffVisitDetail[] = Object.entries(staffMap)
        .map(([id, d]) => ({
          staffId: id,
          staffName: resolveName(id),
          userId: mappingLookup[id]?.userId || null,
          totalVisits: d.visits,
          newClientVisits: d.newClients,
          returningClientVisits: d.visits - d.newClients,
          avgTicket: d.visits > 0 ? d.revenue / d.visits : 0,
          topServices: Object.entries(d.services)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count })),
        }))
        .sort((a, b) => b.totalVisits - a.totalVisits);

      // ── RETENTION ──
      const totalReturning = currentAppts.filter(a => a.is_new_client !== true).length;
      const overallReturningRate = totalVisits > 0 ? (totalReturning / totalVisits) * 100 : 0;
      const priorReturning = priorAppts.filter(a => a.is_new_client !== true).length;
      const priorReturningRate = priorTotalVisits > 0 ? (priorReturning / priorTotalVisits) * 100 : 0;
      const retentionPercentChange = priorReturningRate > 0
        ? ((overallReturningRate - priorReturningRate) / priorReturningRate) * 100
        : null;

      const retentionBreakdown: StaffRetentionDetail[] = Object.entries(staffMap)
        .filter(([, d]) => d.visits > 0)
        .map(([id, d]) => ({
          staffId: id,
          staffName: resolveName(id),
          userId: mappingLookup[id]?.userId || null,
          totalVisits: d.visits,
          newClientVisits: d.newClients,
          returningClientVisits: d.visits - d.newClients,
          returningRate: ((d.visits - d.newClients) / d.visits) * 100,
          avgTicket: d.visits > 0 ? d.revenue / d.visits : 0,
        }))
        .sort((a, b) => b.returningRate - a.returningRate);

      // ── REBOOKING ──
      const currentRebooked = currentAppts.filter(a => a.rebooked_at_checkout === true).length;
      const overallRebookingRate = currentAppts.length > 0 ? (currentRebooked / currentAppts.length) * 100 : 0;
      const priorRebooked = priorAppts.filter(a => a.rebooked_at_checkout === true).length;
      const priorRebookingRate = priorAppts.length > 0 ? (priorRebooked / priorAppts.length) * 100 : 0;
      const rebookingPercentChange = priorRebookingRate > 0
        ? ((overallRebookingRate - priorRebookingRate) / priorRebookingRate) * 100
        : null;

      const rebookingBreakdown: StaffRebookingDetail[] = Object.entries(staffMap)
        .filter(([, d]) => d.visits > 0)
        .map(([id, d]) => ({
          staffId: id,
          staffName: resolveName(id),
          userId: mappingLookup[id]?.userId || null,
          totalAppointments: d.visits,
          rebookedCount: d.rebooked,
          rebookingRate: (d.rebooked / d.visits) * 100,
          avgTicketRebooked: d.rebooked > 0 ? d.revenueRebooked / d.rebooked : 0,
          avgTicketNotRebooked: (d.visits - d.rebooked) > 0 ? d.revenueNotRebooked / (d.visits - d.rebooked) : 0,
        }))
        .sort((a, b) => b.rebookingRate - a.rebookingRate);

      // ── AVG TICKET ──
      const totalRevenueCurrent = currentAppts.reduce((sum, a) => sum + ((Number(a.total_price) || 0) - (Number(a.tip_amount) || 0)), 0);
      const avgTicketCurrent = totalVisits > 0 ? totalRevenueCurrent / totalVisits : 0;
      const totalRevenuePrior = priorAppts.reduce((sum, a) => sum + ((Number(a.total_price) || 0) - (Number(a.tip_amount) || 0)), 0);
      const avgTicketPrior = priorTotalVisits > 0 ? totalRevenuePrior / priorTotalVisits : 0;
      const avgTicketPercentChange = avgTicketPrior > 0
        ? ((avgTicketCurrent - avgTicketPrior) / avgTicketPrior) * 100
        : null;

      return {
        visits: {
          total: totalVisits,
          priorTotal: priorTotalVisits,
          percentChange: visitsPercentChange,
          staffBreakdown: visitsBreakdown,
        },
        retention: {
          overallRate: overallReturningRate,
          priorRate: priorReturningRate,
          percentChange: retentionPercentChange,
          staffBreakdown: retentionBreakdown,
        },
        rebooking: {
          overallRate: overallRebookingRate,
          priorRate: priorRebookingRate,
          percentChange: rebookingPercentChange,
          staffBreakdown: rebookingBreakdown,
        },
        avgTicket: {
          current: avgTicketCurrent,
          prior: avgTicketPrior,
          percentChange: avgTicketPercentChange,
        },
        hasNames,
      };
    },
  });
}
