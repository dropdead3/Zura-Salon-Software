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
          .select('appointment_date, total_price, tip_amount, status, phorest_client_id, rebooked_at_checkout')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('appointment_date', dateFrom).lte('appointment_date', dateTo),
        supabase.from('phorest_appointments')
          .select('total_price, phorest_client_id, rebooked_at_checkout, status')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('appointment_date', priorFrom).lte('appointment_date', priorTo),
        supabase.from('phorest_appointments')
          .select('total_price, phorest_client_id, rebooked_at_checkout, status')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('appointment_date', twoPriorFrom).lte('appointment_date', twoPriorTo),
      ]);

      const currentApts = currentAptsRes.data || [];
      const priorApts = priorAptsRes.data || [];
      const twoPriorApts = twoPriorAptsRes.data || [];

      // ── Fetch transaction items for services/products (paginated) ──
      const PAGE_SIZE = 1000;
      const items: any[] = [];
      {
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('phorest_transaction_items')
            .select('item_name, item_type, item_category, quantity, total_amount, phorest_client_id, transaction_date')
            .eq('phorest_staff_id', phorestStaffId)
            .gte('transaction_date', dateFrom).lte('transaction_date', dateTo)
            .range(offset, offset + PAGE_SIZE - 1);
          if (error) throw error;
          items.push(...(data || []));
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
      }

      // ── Fetch performance metrics ──
      const [currentMetricsRes, priorMetricsRes, twoPriorMetricsRes] = await Promise.all([
        supabase.from('phorest_performance_metrics')
          .select('rebooking_rate, retention_rate, new_clients, retail_sales')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('week_start', dateFrom).lte('week_start', dateTo),
        supabase.from('phorest_performance_metrics')
          .select('rebooking_rate, retention_rate, new_clients')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('week_start', priorFrom).lte('week_start', priorTo),
        supabase.from('phorest_performance_metrics')
          .select('rebooking_rate, retention_rate, new_clients')
          .eq('phorest_staff_id', phorestStaffId)
          .gte('week_start', twoPriorFrom).lte('week_start', twoPriorTo),
      ]);

      const currentMetrics = currentMetricsRes.data || [];
      const priorMetrics = priorMetricsRes.data || [];
      const twoPriorMetrics = twoPriorMetricsRes.data || [];

      // ── TEAM AVERAGES: fetch all staff appointments for the same period ──
      const { data: allStaffApts } = await supabase
        .from('phorest_appointments')
        .select('phorest_staff_id, total_price, phorest_client_id, status')
        .gte('appointment_date', dateFrom).lte('appointment_date', dateTo)
        .not('phorest_staff_id', 'is', null);

      const { data: allStaffMetrics } = await supabase
        .from('phorest_performance_metrics')
        .select('phorest_staff_id, rebooking_rate, retention_rate, new_clients')
        .gte('week_start', dateFrom).lte('week_start', dateTo)
        .not('phorest_staff_id', 'is', null);

      // ── Compute individual revenue ──
      let totalRevenue = 0;
      let totalTips = 0;
      let completed = 0;
      let noShows = 0;
      let cancelled = 0;
      const clientSet = new Set<string>();
      const dailyRevMap = new Map<string, number>();
      let rebookedCount = 0;

      currentApts.forEach((a: any) => {
        const price = Number(a.total_price) || 0;
        totalRevenue += price;
        totalTips += Number(a.tip_amount) || 0;
        if (a.phorest_client_id) clientSet.add(a.phorest_client_id);
        if (a.rebooked_at_checkout) rebookedCount++;

        const status = (a.status || '').toLowerCase();
        if (status === 'no_show' || status === 'noshow' || status === 'no-show') noShows++;
        else if (status === 'cancelled' || status === 'canceled') cancelled++;
        else completed++;

        if (a.appointment_date) {
          dailyRevMap.set(a.appointment_date, (dailyRevMap.get(a.appointment_date) || 0) + price);
        }
      });

      const totalAppointments = currentApts.length;
      const avgTicket = completed > 0 ? totalRevenue / completed : 0;
      const workingDays = Math.max(differenceInBusinessDays(to, from), 1);
      const avgPerDay = totalAppointments / workingDays;

      // Prior period revenue
      let priorTotalRevenue = 0;
      priorApts.forEach((a: any) => { priorTotalRevenue += Number(a.total_price) || 0; });

      let twoPriorTotalRevenue = 0;
      twoPriorApts.forEach((a: any) => { twoPriorTotalRevenue += Number(a.total_price) || 0; });

      const revenueChange = priorTotalRevenue > 0
        ? ((totalRevenue - priorTotalRevenue) / priorTotalRevenue) * 100
        : (totalRevenue > 0 ? 100 : 0);

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

      // ── Client metrics from performance_metrics ──
      const avgRebook = currentMetrics.length > 0
        ? currentMetrics.reduce((s: number, m: any) => s + (Number(m.rebooking_rate) || 0), 0) / currentMetrics.length
        : (completed > 0 ? (rebookedCount / completed) * 100 : 0);
      const avgRetention = currentMetrics.length > 0
        ? currentMetrics.reduce((s: number, m: any) => s + (Number(m.retention_rate) || 0), 0) / currentMetrics.length
        : 0;
      const totalNewClients = currentMetrics.reduce((s: number, m: any) => s + (Number(m.new_clients) || 0), 0);

      // Prior period metrics for multi-period trend
      const priorRebook = priorMetrics.length > 0
        ? priorMetrics.reduce((s: number, m: any) => s + (Number(m.rebooking_rate) || 0), 0) / priorMetrics.length : 0;
      const priorRetention = priorMetrics.length > 0
        ? priorMetrics.reduce((s: number, m: any) => s + (Number(m.retention_rate) || 0), 0) / priorMetrics.length : 0;
      const twoPriorRebook = twoPriorMetrics.length > 0
        ? twoPriorMetrics.reduce((s: number, m: any) => s + (Number(m.rebooking_rate) || 0), 0) / twoPriorMetrics.length : 0;
      const twoPriorRetention = twoPriorMetrics.length > 0
        ? twoPriorMetrics.reduce((s: number, m: any) => s + (Number(m.retention_rate) || 0), 0) / twoPriorMetrics.length : 0;

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
        c.revenue += Number(a.total_price) || 0;
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

      // ── Team averages ──
      const teamStaffMap = new Map<string, { revenue: number; appointments: number }>();
      (allStaffApts || []).forEach((a: any) => {
        const sid = a.phorest_staff_id;
        if (!sid) return;
        if (!teamStaffMap.has(sid)) teamStaffMap.set(sid, { revenue: 0, appointments: 0 });
        const t = teamStaffMap.get(sid)!;
        t.revenue += Number(a.total_price) || 0;
        t.appointments++;
      });

      const teamMetricsMap = new Map<string, { rebook: number; retention: number; newClients: number; count: number }>();
      (allStaffMetrics || []).forEach((m: any) => {
        const sid = m.phorest_staff_id;
        if (!sid) return;
        if (!teamMetricsMap.has(sid)) teamMetricsMap.set(sid, { rebook: 0, retention: 0, newClients: 0, count: 0 });
        const t = teamMetricsMap.get(sid)!;
        t.rebook += Number(m.rebooking_rate) || 0;
        t.retention += Number(m.retention_rate) || 0;
        t.newClients += Number(m.new_clients) || 0;
        t.count++;
      });

      const teamCount = Math.max(teamStaffMap.size, 1);
      const teamTotalRevenue = Array.from(teamStaffMap.values()).reduce((s, t) => s + t.revenue, 0);
      const teamTotalApts = Array.from(teamStaffMap.values()).reduce((s, t) => s + t.appointments, 0);

      let teamAvgRebook = 0, teamAvgRetention = 0, teamAvgNewClients = 0;
      teamMetricsMap.forEach(t => {
        if (t.count > 0) { teamAvgRebook += t.rebook / t.count; teamAvgRetention += t.retention / t.count; }
        teamAvgNewClients += t.newClients;
      });
      const metricsTeamCount = Math.max(teamMetricsMap.size, 1);

      const teamAverages: TeamAverages = {
        revenue: teamTotalRevenue / teamCount,
        avgTicket: teamTotalApts > 0 ? teamTotalRevenue / teamTotalApts : 0,
        appointments: teamTotalApts / teamCount,
        rebookingRate: teamAvgRebook / metricsTeamCount,
        retentionRate: teamAvgRetention / metricsTeamCount,
        newClients: teamAvgNewClients / metricsTeamCount,
        experienceScore: 0,
        complianceRate: 0, // Populated below after individual compliance is computed
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
    revenue: { total: 0, service: 0, product: 0, avgTicket: 0, priorTotal: 0, revenueChange: 0, dailyTrend: [] },
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
