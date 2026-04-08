import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { differenceInDays, parseISO, subDays, format, differenceInBusinessDays } from 'date-fns';
import { isExtensionProduct, isColorOrChemicalService } from '@/utils/serviceCategorization';
import { useResolveCommission } from '@/hooks/useResolveCommission';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StaffProfile {
  userId: string;
  name: string;
  displayName: string | null;
  photoUrl: string | null;
  email: string | null;
  role: string | null;
  hireDate: string | null;
  locationName: string | null;
}

export interface StaffRevenue {
  total: number;
  service: number;
  product: number;
  tips: number;
  avgTicket: number;
  priorTotal: number;
  revenueChange: number;
  dailyTrend: { date: string; revenue: number }[];
}

export interface StaffProductivity {
  totalAppointments: number;
  completed: number;
  noShows: number;
  cancelled: number;
  avgPerDay: number;
  uniqueClients: number;
}

export interface StaffClientMetrics {
  rebookingRate: number;
  retentionRate: number;
  newClients: number;
  totalUniqueClients: number;
}

export interface StaffRetail {
  productRevenue: number;
  unitsSold: number;
  attachmentRate: number;
}

export interface ExperienceScore {
  composite: number;
  status: 'needs-attention' | 'watch' | 'strong';
  rebookRate: number;
  tipRate: number;
  retentionRate: number;
  retailAttachment: number;
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
  avgPrice: number;
}

export interface TopClient {
  clientId: string;
  name: string;
  visits: number;
  revenue: number;
  lastVisit: string;
  avgTicket: number;
  atRisk: boolean;
}

export interface CommissionData {
  serviceCommission: number;
  productCommission: number;
  totalCommission: number;
  tierName: string;
  source?: 'override' | 'location_override' | 'level' | 'unassigned';
  sourceName?: string;
}

export interface TeamAverages {
  revenue: number;
  avgTicket: number;
  appointments: number;
  rebookingRate: number;
  retentionRate: number;
  newClients: number;
  experienceScore: number;
  complianceRate: number;
}

export interface ColorBarCompliance {
  complianceRate: number;
  totalColorAppointments: number;
  tracked: number;
  missed: number;
  reweighRate: number;
  manualOverrides: number;
}

export interface MultiPeriodTrend {
  revenue: [number, number, number]; // 2-ago, prior, current
  rebooking: [number, number, number];
  retention: [number, number, number];
}

export interface IndividualStaffReportData {
  profile: StaffProfile;
  revenue: StaffRevenue;
  productivity: StaffProductivity;
  clientMetrics: StaffClientMetrics;
  retail: StaffRetail;
  experienceScore: ExperienceScore;
  topServices: TopService[];
  topClients: TopClient[];
  commission: CommissionData;
  teamAverages: TeamAverages;
  multiPeriodTrend: MultiPeriodTrend;
  colorBarCompliance: ColorBarCompliance;
}

// ---------------------------------------------------------------------------
// Experience score helpers (matching useStylistExperienceScore logic)
// ---------------------------------------------------------------------------

const EXP_WEIGHTS = { rebookRate: 0.35, tipRate: 0.30, retentionRate: 0.20, retailAttachment: 0.15 };

function normalizeTipRate(tipRate: number): number {
  return Math.min((tipRate / 25) * 100, 100);
}

function getExpStatus(score: number): 'needs-attention' | 'watch' | 'strong' {
  if (score < 50) return 'needs-attention';
  if (score < 70) return 'watch';
  return 'strong';
}

// ---------------------------------------------------------------------------
// Product item_type variants
// ---------------------------------------------------------------------------
const PRODUCT_TYPES = ['Product', 'product', 'PRODUCT', 'Retail', 'retail', 'RETAIL'];
const SERVICE_TYPES = ['Service', 'service', 'SERVICE'];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useIndividualStaffReport(staffUserId: string | null, dateFrom?: string, dateTo?: string) {
  const { resolveCommission, isLoading: tiersLoading } = useResolveCommission();

  const query = useQuery({
    queryKey: ['individual-staff-report', staffUserId, dateFrom, dateTo],
    queryFn: async (): Promise<IndividualStaffReportData | null> => {
      if (!staffUserId || !dateFrom || !dateTo) return null;

      const from = parseISO(dateFrom);
      const to = parseISO(dateTo);
      const span = differenceInDays(to, from) + 1;
      const priorFrom = format(subDays(from, span), 'yyyy-MM-dd');
      const priorTo = format(subDays(from, 1), 'yyyy-MM-dd');
      const twoPriorFrom = format(subDays(from, span * 2), 'yyyy-MM-dd');
      const twoPriorTo = format(subDays(from, span + 1), 'yyyy-MM-dd');

      // ── Get staff mapping (user_id -> phorest_staff_id) ──
      const { data: mapping } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id')
        .eq('user_id', staffUserId)
        .eq('is_active', true)
        .maybeSingle();

      const phorestStaffId = (mapping as any)?.phorest_staff_id;

      // ── Profile ──
      const { data: profileData } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url, email, hire_date, location_id')
        .eq('user_id', staffUserId)
        .maybeSingle();

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', staffUserId)
        .limit(1);

      let locationName: string | null = null;
      if (profileData?.location_id) {
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', profileData.location_id)
          .maybeSingle();
        locationName = (loc as any)?.name || null;
      }

      const profile: StaffProfile = {
        userId: staffUserId,
        name: profileData ? formatDisplayName(profileData.full_name || '', profileData.display_name) : 'Unknown',
        displayName: profileData?.display_name || null,
        photoUrl: profileData?.photo_url || null,
        email: profileData?.email || null,
        role: userRoles?.[0]?.role || null,
        hireDate: profileData?.hire_date || null,
        locationName,
      };

      if (!phorestStaffId) {
        // Staff has no Phorest mapping -- return empty data with profile
        return buildEmptyResult(profile, (svc: number, prod: number) => resolveCommission(staffUserId!, svc, prod));
      }

      // ── Fetch appointments for current + prior + two-prior periods ──
      const [currentAptsRes, priorAptsRes, twoPriorAptsRes] = await Promise.all([
        supabase.from('phorest_appointments')
          .select('appointment_date, total_price, tip_amount, status, phorest_client_id, rebooked_at_checkout, is_new_client')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('appointment_date', dateFrom).lte('appointment_date', dateTo),
        supabase.from('phorest_appointments')
          .select('total_price, tip_amount, phorest_client_id, rebooked_at_checkout, status, is_new_client')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('appointment_date', priorFrom).lte('appointment_date', priorTo),
        supabase.from('phorest_appointments')
          .select('total_price, tip_amount, phorest_client_id, rebooked_at_checkout, status, is_new_client')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('appointment_date', twoPriorFrom).lte('appointment_date', twoPriorTo),
      ]);

      const currentApts = currentAptsRes.data || [];
      const priorApts = priorAptsRes.data || [];
      const twoPriorApts = twoPriorAptsRes.data || [];

      // ── Fetch transaction items for services/products (paginated) ──
      const PAGE_SIZE = 1000;
      async function fetchTxnItems(fromDate: string, toDate: string) {
        const result: any[] = [];
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('phorest_transaction_items')
            .select('item_name, item_type, item_category, quantity, total_amount, tax_amount, phorest_client_id, transaction_date')
            .eq('phorest_staff_id', phorestStaffId)
            .gte('transaction_date', `${fromDate}T00:00:00`).lte('transaction_date', `${toDate}T23:59:59`)
            .range(offset, offset + PAGE_SIZE - 1);
          if (error) throw error;
          result.push(...(data || []));
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
        return result;
      }

      const [items, priorItems, twoPriorItems] = await Promise.all([
        fetchTxnItems(dateFrom, dateTo),
        fetchTxnItems(priorFrom, priorTo),
        fetchTxnItems(twoPriorFrom, twoPriorTo),
      ]);

      // ── Compute rebooking/retention/newClients from appointments (live, no phorest_performance_metrics) ──
      function computeClientMetrics(apts: any[]) {
        const validApts = apts.filter((a: any) => {
          const s = (a.status || '').toLowerCase();
          return s !== 'cancelled' && s !== 'canceled' && s !== 'no_show' && s !== 'noshow' && s !== 'no-show';
        });
        const total = validApts.length;
        const rebooked = validApts.filter((a: any) => a.rebooked_at_checkout).length;
        const newC = validApts.filter((a: any) => a.is_new_client === true).length;
        const returning = total - newC;
        return {
          rebookingRate: total > 0 ? (rebooked / total) * 100 : 0,
          retentionRate: total > 0 ? (returning / total) * 100 : 0,
          newClients: newC,
        };
      }

      const currentClientMetrics = computeClientMetrics(currentApts);
      const priorClientMetrics = computeClientMetrics(priorApts);
      const twoPriorClientMetrics = computeClientMetrics(twoPriorApts);

      // ── Fetch all staff appointments for team averages (replaces phorest_performance_metrics) ──
      const allStaffAptsData = await fetchAllBatched<{
        phorest_staff_id: string | null;
        rebooked_at_checkout: boolean | null;
        is_new_client: boolean | null;
        status: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_appointments')
          .select('phorest_staff_id, rebooked_at_checkout, is_new_client, status')
          .gte('appointment_date', dateFrom).lte('appointment_date', dateTo)
          .not('status', 'in', '("cancelled","no_show")')
          .eq('is_demo', false)
          .range(from, to);
        return q;
      });

      async function fetchAllTeamTxnItems(fromDate: string, toDate: string) {
        const result: any[] = [];
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('phorest_transaction_items')
            .select('phorest_staff_id, item_type, total_amount, tax_amount, phorest_client_id, transaction_date')
            .gte('transaction_date', `${fromDate}T00:00:00`).lte('transaction_date', `${toDate}T23:59:59`)
            .not('phorest_staff_id', 'is', null)
            .range(offset, offset + PAGE_SIZE - 1);
          if (error) throw error;
          result.push(...(data || []));
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
        return result;
      }

      const allStaffTxnItems = await fetchAllTeamTxnItems(dateFrom, dateTo);
      const allStaffApts = allStaffAptsData || [];

      // ── Compute individual metrics from appointments (counts, tips, status) ──
      let totalTips = 0;
      let completed = 0;
      let noShows = 0;
      let cancelled = 0;
      const clientSet = new Set<string>();
      let rebookedCount = 0;

      currentApts.forEach((a: any) => {
        totalTips += Number(a.tip_amount) || 0;
        if (a.phorest_client_id) clientSet.add(a.phorest_client_id);
        if (a.rebooked_at_checkout) rebookedCount++;

        const status = (a.status || '').toLowerCase();
        if (status === 'no_show' || status === 'noshow' || status === 'no-show') noShows++;
        else if (status === 'cancelled' || status === 'canceled') cancelled++;
        else completed++;
      });

      const totalAppointments = currentApts.length;
      const workingDays = Math.max(differenceInBusinessDays(to, from), 1);
      const avgPerDay = totalAppointments / workingDays;

      // ── Revenue from transaction items (source of truth, matching POS) ──
      function computeTxnRevenue(txnItems: any[]) {
        let svcRev = 0, prodRev = 0, taxTotal = 0;
        const visitKeys = new Set<string>();
        txnItems.forEach((item: any) => {
          const amount = Number(item.total_amount) || 0;
          const tax = Number(item.tax_amount) || 0;
          const isProduct = PRODUCT_TYPES.includes(item.item_type);
          const isService = SERVICE_TYPES.includes(item.item_type);
          if (isService) svcRev += amount;
          if (isProduct) { prodRev += amount + tax; taxTotal += tax; }
          // Track unique client visits for avg ticket
          if (item.phorest_client_id && item.transaction_date) {
            const dateOnly = typeof item.transaction_date === 'string' ? item.transaction_date.substring(0, 10) : item.transaction_date;
            visitKeys.add(`${item.phorest_client_id}|${dateOnly}`);
          }
        });
        return { svcRev, prodRev, total: svcRev + prodRev, uniqueVisits: visitKeys.size };
      }

      const currentTxnRev = computeTxnRevenue(items);
      const priorTxnRev = computeTxnRevenue(priorItems);
      const twoPriorTxnRev = computeTxnRevenue(twoPriorItems);

      const totalRevenue = currentTxnRev.total;
      const avgTicket = currentTxnRev.uniqueVisits > 0 ? totalRevenue / currentTxnRev.uniqueVisits : 0;

      // Prior period revenue (from transaction items)
      const priorTotalRevenue = priorTxnRev.total;
      const twoPriorTotalRevenue = twoPriorTxnRev.total;

      const revenueChange = priorTotalRevenue > 0
        ? ((totalRevenue - priorTotalRevenue) / priorTotalRevenue) * 100
        : (totalRevenue > 0 ? 100 : 0);

      // Daily trend from transaction items
      const dailyRevMap = new Map<string, number>();
      items.forEach((item: any) => {
        if (!item.transaction_date) return;
        const dateOnly = typeof item.transaction_date === 'string' ? item.transaction_date.substring(0, 10) : item.transaction_date;
        const amount = Number(item.total_amount) || 0;
        const tax = Number(item.tax_amount) || 0;
        const isProduct = PRODUCT_TYPES.includes(item.item_type);
        dailyRevMap.set(dateOnly, (dailyRevMap.get(dateOnly) || 0) + amount + tax);
      });

      const dailyTrend = Array.from(dailyRevMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // ── Service vs product revenue from transaction items ──
      let serviceRevenue = 0;
      let productRevenue = 0;
      let productUnits = 0;
      const serviceVisitKeys = new Set<string>();
      const productVisitKeys = new Set<string>();
      const serviceMap = new Map<string, { count: number; revenue: number }>();

      items.forEach((item: any) => {
        const isProduct = PRODUCT_TYPES.includes(item.item_type);
        const isService = SERVICE_TYPES.includes(item.item_type);
        const visitKey = item.phorest_client_id && item.transaction_date
          ? `${item.phorest_client_id}|${item.transaction_date}`
          : null;
        if (isProduct) {
          productRevenue += Number(item.total_amount) || 0;
          productUnits += item.quantity || 1;
          if (visitKey && !isExtensionProduct(item.item_name)) productVisitKeys.add(visitKey);
        }
        if (isService) {
          serviceRevenue += Number(item.total_amount) || 0;
          if (visitKey) serviceVisitKeys.add(visitKey);
          const sName = item.item_name || 'Unknown Service';
          if (!serviceMap.has(sName)) serviceMap.set(sName, { count: 0, revenue: 0 });
          const s = serviceMap.get(sName)!;
          s.count++;
          s.revenue += Number(item.total_amount) || 0;
        }
      });

      // Attachment rate for this stylist (client+date composite key matching)
      let attachedCount = 0;
      serviceVisitKeys.forEach(key => { if (productVisitKeys.has(key)) attachedCount++; });
      const attachmentRate = serviceVisitKeys.size > 0 ? Math.round((attachedCount / serviceVisitKeys.size) * 100) : 0;

      // ── Client metrics from live appointment data ──
      const avgRebook = currentClientMetrics.rebookingRate;
      const avgRetention = currentClientMetrics.retentionRate;
      const totalNewClients = currentClientMetrics.newClients;

      // Prior period metrics for multi-period trend
      const priorRebook = priorClientMetrics.rebookingRate;
      const priorRetention = priorClientMetrics.retentionRate;
      const twoPriorRebook = twoPriorClientMetrics.rebookingRate;
      const twoPriorRetention = twoPriorClientMetrics.retentionRate;

      // ── Experience score ──
      const tipRate = totalRevenue > 0 ? (totalTips / totalRevenue) * 100 : 0;
      const retailAtt = serviceVisitKeys.size > 0 ? (attachedCount / serviceVisitKeys.size) * 100 : 0;
      const compositeScore = totalAppointments >= 5
        ? Math.round(
            avgRebook * EXP_WEIGHTS.rebookRate +
            normalizeTipRate(tipRate) * EXP_WEIGHTS.tipRate +
            avgRetention * EXP_WEIGHTS.retentionRate +
            Math.min(retailAtt, 100) * EXP_WEIGHTS.retailAttachment
          )
        : 0;

      // ── Top services ──
      const topServices: TopService[] = Array.from(serviceMap.entries())
        .map(([name, d]) => ({
          name,
          count: d.count,
          revenue: d.revenue,
          avgPrice: d.count > 0 ? d.revenue / d.count : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // ── Top clients ──
      const clientRevMap = new Map<string, { visits: number; revenue: number; lastVisit: string }>();
      currentApts.forEach((a: any) => {
        const cid = a.phorest_client_id;
        if (!cid) return;
        if (!clientRevMap.has(cid)) clientRevMap.set(cid, { visits: 0, revenue: 0, lastVisit: '' });
        const c = clientRevMap.get(cid)!;
        c.visits++;
        c.revenue += (Number(a.total_price) || 0) - (Number(a.tip_amount) || 0);
        if (a.appointment_date > c.lastVisit) c.lastVisit = a.appointment_date;
      });

      // Fetch client names
      const clientIds = Array.from(clientRevMap.keys());
      let clientNameMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('phorest_clients')
          .select('phorest_client_id, first_name, last_name')
          .in('phorest_client_id', clientIds.slice(0, 50));
        (clients || []).forEach((c: any) => {
          clientNameMap.set(c.phorest_client_id, `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown');
        });
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');

      const topClients: TopClient[] = Array.from(clientRevMap.entries())
        .map(([clientId, d]) => ({
          clientId,
          name: clientNameMap.get(clientId) || 'Unknown Client',
          visits: d.visits,
          revenue: d.revenue,
          lastVisit: d.lastVisit,
          avgTicket: d.visits > 0 ? d.revenue / d.visits : 0,
          atRisk: d.lastVisit < sixtyDaysAgo,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // ── Commission (resolved via 3-tier priority) ──
      const resolved = resolveCommission(staffUserId, serviceRevenue, productRevenue);
      const commission: CommissionData = {
        serviceCommission: resolved.serviceCommission,
        productCommission: resolved.retailCommission,
        totalCommission: resolved.totalCommission,
        tierName: resolved.sourceName,
        source: resolved.source,
        sourceName: resolved.sourceName,
      };

      // ── Team averages (from transaction items for revenue consistency) ──
      const teamStaffMap = new Map<string, { revenue: number; uniqueVisits: Set<string> }>();
      (allStaffTxnItems || []).forEach((item: any) => {
        const sid = item.phorest_staff_id;
        if (!sid) return;
        if (!teamStaffMap.has(sid)) teamStaffMap.set(sid, { revenue: 0, uniqueVisits: new Set() });
        const t = teamStaffMap.get(sid)!;
        const amount = Number(item.total_amount) || 0;
        const tax = Number(item.tax_amount) || 0;
        const isProduct = PRODUCT_TYPES.includes(item.item_type);
        t.revenue += amount + (isProduct ? tax : 0);
        if (item.phorest_client_id && item.transaction_date) {
          const dateOnly = typeof item.transaction_date === 'string' ? item.transaction_date.substring(0, 10) : item.transaction_date;
          t.uniqueVisits.add(`${item.phorest_client_id}|${dateOnly}`);
        }
      });

      const teamCount = Math.max(teamStaffMap.size, 1);
      const teamTotalRevenue = Array.from(teamStaffMap.values()).reduce((s, t) => s + t.revenue, 0);
      const teamTotalVisits = Array.from(teamStaffMap.values()).reduce((s, t) => s + t.uniqueVisits.size, 0);

      // Team metrics from appointments (live data)
      const teamAptsMap = new Map<string, { total: number; rebooked: number; newClients: number }>();
      allStaffApts.forEach((a: any) => {
        const sid = a.phorest_staff_id;
        if (!sid) return;
        if (!teamAptsMap.has(sid)) teamAptsMap.set(sid, { total: 0, rebooked: 0, newClients: 0 });
        const t = teamAptsMap.get(sid)!;
        t.total++;
        if (a.rebooked_at_checkout) t.rebooked++;
        if (a.is_new_client) t.newClients++;
      });

      let teamAvgRebook = 0, teamAvgRetention = 0, teamAvgNewClients = 0;
      teamAptsMap.forEach(t => {
        if (t.total > 0) {
          teamAvgRebook += (t.rebooked / t.total) * 100;
          teamAvgRetention += ((t.total - t.newClients) / t.total) * 100;
        }
        teamAvgNewClients += t.newClients;
      });
      const metricsTeamCount = Math.max(teamAptsMap.size, 1);

      const teamAverages: TeamAverages = {
        revenue: teamTotalRevenue / teamCount,
        avgTicket: teamTotalVisits > 0 ? teamTotalRevenue / teamTotalVisits : 0,
        appointments: 0,
        rebookingRate: teamAvgRebook / metricsTeamCount,
        retentionRate: teamAvgRetention / metricsTeamCount,
        newClients: teamAvgNewClients / metricsTeamCount,
        experienceScore: 0,
        complianceRate: 0,
      };

      // ── Color Bar Compliance (color/chemical appointments vs mix_sessions) ──
      const staffColorAppts = currentApts.filter((a: any) =>
        isColorOrChemicalService(a.service_name ?? null, a.service_category ?? null),
      );
      let brCompliance: ColorBarCompliance = {
        complianceRate: 100, totalColorAppointments: 0, tracked: 0, missed: 0, reweighRate: 100, manualOverrides: 0,
      };

      if (staffColorAppts.length > 0) {
        // Gather IDs from phorest_appointments (source of truth for this report)
        const phorestColorIds = staffColorAppts.map((a: any) => a.id).filter(Boolean);

        // Also check local appointments table for mix_session cross-reference
        const { data: localColorAppts } = await supabase
          .from('appointments')
          .select('id')
          .eq('staff_user_id', staffUserId!)
          .gte('appointment_date', dateFrom!).lte('appointment_date', dateTo!)
          .not('status', 'in', '("cancelled","no_show")');

        const localColorIds = (localColorAppts ?? []).map((a: any) => a.id);

        // Merge both ID sets — mix_sessions may reference either table's IDs
        const allLookupIds = [...new Set([...phorestColorIds, ...localColorIds])];

        if (allLookupIds.length > 0) {
          const { data: mixSessions } = await supabase
            .from('mix_sessions')
            .select('id, appointment_id')
            .in('appointment_id', allLookupIds);

          const trackedSet = new Set((mixSessions ?? []).map((s: any) => s.appointment_id));
          const tracked = trackedSet.size;
          const totalColor = staffColorAppts.length;

          brCompliance = {
            complianceRate: totalColor > 0 ? Math.round((tracked / totalColor) * 100) : 100,
            totalColorAppointments: totalColor,
            tracked,
            missed: totalColor - tracked,
            reweighRate: 100,
            manualOverrides: 0,
          };
        } else {
          // No IDs to cross-reference but we know color appointments exist
          brCompliance = {
            complianceRate: 0,
            totalColorAppointments: staffColorAppts.length,
            tracked: 0,
            missed: staffColorAppts.length,
            reweighRate: 0,
            manualOverrides: 0,
          };
        }
      }

      // Update team avg compliance (approximate — would need all-staff computation for accuracy)
      teamAverages.complianceRate = brCompliance.complianceRate;

      // ── Multi-period trend ──
      const multiPeriodTrend: MultiPeriodTrend = {
        revenue: [twoPriorTotalRevenue, priorTotalRevenue, totalRevenue],
        rebooking: [twoPriorRebook, priorRebook, avgRebook],
        retention: [twoPriorRetention, priorRetention, avgRetention],
      };

      return {
        profile,
        revenue: {
          total: totalRevenue,
          service: serviceRevenue,
          product: productRevenue,
          tips: totalTips,
          avgTicket,
          priorTotal: priorTotalRevenue,
          revenueChange,
          dailyTrend,
        },
        productivity: {
          totalAppointments,
          completed,
          noShows,
          cancelled,
          avgPerDay,
          uniqueClients: clientSet.size,
        },
        clientMetrics: {
          rebookingRate: avgRebook,
          retentionRate: avgRetention,
          newClients: totalNewClients,
          totalUniqueClients: clientSet.size,
        },
        retail: {
          productRevenue,
          unitsSold: productUnits,
          attachmentRate,
        },
        experienceScore: {
          composite: compositeScore,
          status: getExpStatus(compositeScore),
          rebookRate: avgRebook,
          tipRate,
          retentionRate: avgRetention,
          retailAttachment: retailAtt,
        },
        topServices,
        topClients,
        commission,
        teamAverages,
        multiPeriodTrend,
        colorBarCompliance: brCompliance,
      };
    },
    enabled: !!staffUserId && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading || tiersLoading,
    error: query.error,
  };
}

// ---------------------------------------------------------------------------
// Empty result helper
// ---------------------------------------------------------------------------

function buildEmptyResult(profile: StaffProfile, calculateCommission: any): IndividualStaffReportData {
  return {
    profile,
    revenue: { total: 0, service: 0, product: 0, tips: 0, avgTicket: 0, priorTotal: 0, revenueChange: 0, dailyTrend: [] },
    productivity: { totalAppointments: 0, completed: 0, noShows: 0, cancelled: 0, avgPerDay: 0, uniqueClients: 0 },
    clientMetrics: { rebookingRate: 0, retentionRate: 0, newClients: 0, totalUniqueClients: 0 },
    retail: { productRevenue: 0, unitsSold: 0, attachmentRate: 0 },
    experienceScore: { composite: 0, status: 'needs-attention', rebookRate: 0, tipRate: 0, retentionRate: 0, retailAttachment: 0 },
    topServices: [],
    topClients: [],
    commission: { serviceCommission: 0, productCommission: 0, totalCommission: 0, tierName: '' },
    teamAverages: { revenue: 0, avgTicket: 0, appointments: 0, rebookingRate: 0, retentionRate: 0, newClients: 0, experienceScore: 0, complianceRate: 0 },
    multiPeriodTrend: { revenue: [0, 0, 0], rebooking: [0, 0, 0], retention: [0, 0, 0] },
    colorBarCompliance: { complianceRate: 100, totalColorAppointments: 0, tracked: 0, missed: 0, reweighRate: 100, manualOverrides: 0 },
  };
}
