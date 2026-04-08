/**
 * useLevelEconomicsAnalyzer — Joins level prices, recipe costs, commission rates,
 * hourly wages, and 90-day appointment volume to compute per-level and per-service margins.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEconomicsAssumptions, type EconomicsAssumptions } from '@/hooks/useCommissionEconomics';
import type { StylistLevel } from '@/hooks/useStylistLevels';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

// ─── Output Types ───

export type MarginHealthStatus = 'healthy' | 'tight' | 'negative';

export interface ServiceLevelMargin {
  serviceId: string;
  serviceName: string;
  serviceCategory: string | null;
  levelId: string;
  price: number;
  productCost: number;
  commissionCost: number;
  overheadShare: number;
  wageShare: number;
  netMargin: number;
  marginPct: number;
  appointmentCount: number;
  status: MarginHealthStatus;
  isFallbackPrice: boolean; // true when using base price instead of level-specific price
}

export interface LevelSummary {
  levelId: string;
  levelLabel: string;
  levelIndex: number;
  weightedMarginPct: number;
  totalRevenue: number;
  stylistCount: number;
  avgRevenuePerStylist: number;
  commissionCostTotal: number;
  productCostTotal: number;
  overheadCostTotal: number;
  wageCostTotal: number;
  totalAppointments: number;
  servicesBelow: number; // count of services with margin below target
  status: MarginHealthStatus;
  hasEnoughData: boolean;
}

export interface StylistSnapshot {
  userId: string;
  fullName: string;
  levelId: string;
  levelLabel: string;
  totalRevenue: number;
  totalAppointments: number;
  weightedMarginPct: number;
  effectiveHourlyContribution: number;
  status: MarginHealthStatus;
  hasEnoughData: boolean;
}

export interface LevelEconomicsData {
  levelSummaries: LevelSummary[];
  serviceMatrix: ServiceLevelMargin[];
  stylistSnapshots: StylistSnapshot[];
  dateRange: { start: string; end: string } | null;
  totalAppointments: number;
  isLoading: boolean;
}

const MIN_APPOINTMENTS_PER_CELL = 10;
const MIN_APPOINTMENTS_PER_LEVEL = 50;
const MIN_APPOINTMENTS_PER_STYLIST = 10;

function getStatus(marginPct: number, targetPct: number): MarginHealthStatus {
  if (marginPct >= targetPct) return 'healthy';
  if (marginPct >= 0) return 'tight';
  return 'negative';
}

/**
 * Core hook: fetches all data sources, computes margins.
 * Accepts optional whatIfRates to allow What-If simulator integration.
 */
export function useLevelEconomicsAnalyzer(
  levels: StylistLevel[],
  whatIfRates?: Record<string, { service?: number; retail?: number }>
): LevelEconomicsData {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { assumptions } = useEconomicsAssumptions();

  // Fetch all raw data in a single query
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['level-economics-analyzer', orgId],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const dateStr = ninetyDaysAgo.toISOString().slice(0, 10);

      const [
        levelPricesRes,
        servicesRes,
        baselinesRes,
        productsRes,
        appointmentsRes,
        staffRes,
      ] = await Promise.all([
        supabase
          .from('service_level_prices')
          .select('stylist_level_id, service_id, price')
          .eq('organization_id', orgId!),
        supabase
          .from('services')
          .select('id, name, price, category, is_active')
          .eq('organization_id', orgId!)
          .eq('is_active', true),
        supabase
          .from('service_recipe_baselines')
          .select('service_id, product_id, expected_quantity, cost_per_unit_snapshot')
          .eq('organization_id', orgId!),
        supabase
          .from('products')
          .select('id, cost_per_gram, cost_price')
          .eq('organization_id', orgId!),
        fetchAllBatched<any>((from, to) =>
          supabase
            .from('appointments')
            .select('staff_user_id, service_id, service_name, total_price, appointment_date')
            .eq('organization_id', orgId!)
            .gte('appointment_date', dateStr)
            .in('status', ['completed', 'checked_out'])
            .range(from, to)
        ),
        supabase
          .from('employee_profiles')
          .select('user_id, full_name, stylist_level')
          .eq('organization_id', orgId!)
          .not('stylist_level', 'is', null),
      ]);

      return {
        levelPrices: levelPricesRes.data || [],
        services: servicesRes.data || [],
        baselines: baselinesRes.data || [],
        products: productsRes.data || [],
        appointments: appointmentsRes || [],
        staff: staffRes.data || [],
      };
    },
    enabled: !!orgId && levels.length > 0,
    staleTime: 5 * 60_000,
  });

  const result = useMemo<LevelEconomicsData>(() => {
    if (!rawData || levels.length === 0) {
      return {
        levelSummaries: [],
        serviceMatrix: [],
        stylistSnapshots: [],
        dateRange: null,
        totalAppointments: 0,
        isLoading,
      };
    }

    const { levelPrices, services, baselines, products, appointments, staff } = rawData;

    // ─── Build lookup maps ───

    // Level price: levelId-serviceId → price
    const levelPriceMap = new Map<string, number>();
    for (const lp of levelPrices) {
      levelPriceMap.set(`${lp.stylist_level_id}-${lp.service_id}`, lp.price);
    }

    // Service base price & info
    const serviceMap = new Map<string, { name: string; price: number; category: string | null }>();
    for (const s of services) {
      serviceMap.set(s.id, { name: s.name, price: s.price ?? 0, category: s.category });
    }

    // Product cost map
    const productCostMap = new Map<string, number>();
    for (const p of products) {
      productCostMap.set(p.id, p.cost_per_gram ?? p.cost_price ?? 0);
    }

    // Service product cost (sum of baselines)
    const serviceProductCost = new Map<string, number>();
    for (const b of baselines) {
      const costPerUnit = b.cost_per_unit_snapshot ?? productCostMap.get(b.product_id) ?? 0;
      const cost = costPerUnit * b.expected_quantity;
      const existing = serviceProductCost.get(b.service_id) ?? 0;
      serviceProductCost.set(b.service_id, existing + cost);
    }

    // Staff → level mapping (slug → level id)
    const slugToLevel = new Map<string, StylistLevel>();
    for (const level of levels) {
      slugToLevel.set(level.slug, level);
    }

    const staffLevelMap = new Map<string, string>(); // userId → levelId
    const staffNameMap = new Map<string, string>(); // userId → name
    for (const s of staff) {
      const level = s.stylist_level ? slugToLevel.get(s.stylist_level) : undefined;
      if (level) {
        staffLevelMap.set(s.user_id, level.id);
        staffNameMap.set(s.user_id, s.full_name || 'Unknown');
      }
    }

    // ─── Date range from actual appointment data ───
    let minDate = '';
    let maxDate = '';
    for (const a of appointments) {
      if (!a.appointment_date) continue;
      if (!minDate || a.appointment_date < minDate) minDate = a.appointment_date;
      if (!maxDate || a.appointment_date > maxDate) maxDate = a.appointment_date;
    }

    const dateRange = minDate && maxDate ? { start: minDate, end: maxDate } : null;

    // Calculate actual month span
    let monthSpan = 3;
    if (minDate && maxDate) {
      const startD = new Date(minDate);
      const endD = new Date(maxDate);
      const diffMs = endD.getTime() - startD.getTime();
      const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
      monthSpan = Math.max(1, diffDays / 30.44);
    }

    // ─── Aggregate appointments by level × service and by stylist ───

    // level-service → { count, totalRevenue }
    const levelServiceVolume = new Map<string, { count: number; totalRevenue: number }>();
    // stylist → service → { count, totalRevenue }
    const stylistServiceVolume = new Map<string, Map<string, { count: number; totalRevenue: number }>>();
    // level → { userIds, totalAppointments }
    const levelVolume = new Map<string, { userIds: Set<string>; totalAppointments: number; totalRevenue: number }>();

    for (const appt of appointments) {
      if (!appt.staff_user_id) continue;
      const levelId = staffLevelMap.get(appt.staff_user_id);
      if (!levelId) continue;

      const serviceId = appt.service_id || 'unknown';
      const revenue = appt.total_price ?? 0;

      // Level-service volume
      const lsKey = `${levelId}-${serviceId}`;
      const existing = levelServiceVolume.get(lsKey) ?? { count: 0, totalRevenue: 0 };
      existing.count++;
      existing.totalRevenue += revenue;
      levelServiceVolume.set(lsKey, existing);

      // Level volume
      const lv = levelVolume.get(levelId) ?? { userIds: new Set(), totalAppointments: 0, totalRevenue: 0 };
      lv.userIds.add(appt.staff_user_id);
      lv.totalAppointments++;
      lv.totalRevenue += revenue;
      levelVolume.set(levelId, lv);

      // Stylist-service volume
      if (!stylistServiceVolume.has(appt.staff_user_id)) {
        stylistServiceVolume.set(appt.staff_user_id, new Map());
      }
      const stylistMap = stylistServiceVolume.get(appt.staff_user_id)!;
      const sv = stylistMap.get(serviceId) ?? { count: 0, totalRevenue: 0 };
      sv.count++;
      sv.totalRevenue += revenue;
      stylistMap.set(serviceId, sv);
    }

    // Also count staff with zero appointments
    for (const s of staff) {
      const level = s.stylist_level ? slugToLevel.get(s.stylist_level) : undefined;
      if (!level) continue;
      const lv = levelVolume.get(level.id) ?? { userIds: new Set(), totalAppointments: 0, totalRevenue: 0 };
      lv.userIds.add(s.user_id);
      levelVolume.set(level.id, lv);
    }

    // ─── Compute service × level margin matrix ───

    const serviceMatrix: ServiceLevelMargin[] = [];

    for (const level of levels) {
      const commissionRate = whatIfRates?.[level.id]?.service ?? (level.service_commission_rate ?? 0);
      const hourlyWageCost = level.hourly_wage_enabled && level.hourly_wage
        ? level.hourly_wage * assumptions.hours_per_month
        : 0;

      const lv = levelVolume.get(level.id);
      const avgMonthlyServices = lv
        ? lv.totalAppointments / monthSpan / Math.max(1, lv.userIds.size)
        : 0;
      const overheadPerService = avgMonthlyServices > 0
        ? assumptions.overhead_per_stylist / avgMonthlyServices
        : 0;
      const wagePerService = avgMonthlyServices > 0
        ? hourlyWageCost / avgMonthlyServices
        : 0;

      for (const [serviceId, serviceInfo] of serviceMap) {
        const levelPrice = levelPriceMap.get(`${level.id}-${serviceId}`);
        const price = levelPrice ?? serviceInfo.price;
        const isFallback = levelPrice === undefined;

        const productCost = serviceProductCost.get(serviceId) ?? (price * assumptions.product_cost_pct);
        const commissionCost = price * commissionRate;
        const netMargin = price - commissionCost - productCost - overheadPerService - wagePerService;
        const marginPct = price > 0 ? netMargin / price : 0;

        const lsKey = `${level.id}-${serviceId}`;
        const volume = levelServiceVolume.get(lsKey);
        const apptCount = volume?.count ?? 0;

        serviceMatrix.push({
          serviceId,
          serviceName: serviceInfo.name,
          serviceCategory: serviceInfo.category,
          levelId: level.id,
          price,
          productCost,
          commissionCost,
          overheadShare: overheadPerService,
          wageShare: wagePerService,
          netMargin,
          marginPct,
          appointmentCount: apptCount,
          status: getStatus(marginPct, assumptions.target_margin_pct),
          isFallbackPrice: isFallback,
        });
      }
    }

    // ─── Compute level summaries (weighted by actual service mix) ───

    const levelSummaries: LevelSummary[] = levels.map((level, idx) => {
      const lv = levelVolume.get(level.id);
      const totalAppts = lv?.totalAppointments ?? 0;
      const stylistCount = lv?.userIds.size ?? 0;
      const totalRevenue = lv?.totalRevenue ?? 0;
      const hasEnoughData = totalAppts >= MIN_APPOINTMENTS_PER_LEVEL;

      // Get all margins for this level
      const levelMargins = serviceMatrix.filter(m => m.levelId === level.id);

      // Weighted margin: weight by appointment count
      let weightedMargin = 0;
      let totalWeight = 0;
      let servicesBelow = 0;
      let commCostTotal = 0;
      let prodCostTotal = 0;
      let overheadTotal = 0;
      let wageTotal = 0;

      for (const m of levelMargins) {
        if (m.appointmentCount >= MIN_APPOINTMENTS_PER_CELL) {
          weightedMargin += m.marginPct * m.appointmentCount;
          totalWeight += m.appointmentCount;
          if (m.marginPct < assumptions.target_margin_pct) servicesBelow++;
        }
        commCostTotal += m.commissionCost * m.appointmentCount;
        prodCostTotal += m.productCost * m.appointmentCount;
        overheadTotal += m.overheadShare * m.appointmentCount;
        wageTotal += m.wageShare * m.appointmentCount;
      }

      const finalMargin = totalWeight > 0 ? weightedMargin / totalWeight : 0;

      return {
        levelId: level.id,
        levelLabel: level.label,
        levelIndex: idx,
        weightedMarginPct: finalMargin,
        totalRevenue,
        stylistCount,
        avgRevenuePerStylist: stylistCount > 0 ? totalRevenue / monthSpan / stylistCount : 0,
        commissionCostTotal: commCostTotal,
        productCostTotal: prodCostTotal,
        overheadCostTotal: overheadTotal,
        wageCostTotal: wageTotal,
        totalAppointments: totalAppts,
        servicesBelow,
        status: getStatus(finalMargin, assumptions.target_margin_pct),
        hasEnoughData,
      };
    });

    // ─── Stylist snapshots ───

    const stylistSnapshots: StylistSnapshot[] = [];

    for (const [userId, svcMap] of stylistServiceVolume) {
      const levelId = staffLevelMap.get(userId);
      if (!levelId) continue;
      const level = levels.find(l => l.id === levelId);
      if (!level) continue;

      let totalRevenue = 0;
      let totalAppts = 0;
      let weightedMargin = 0;

      for (const [serviceId, vol] of svcMap) {
        totalRevenue += vol.totalRevenue;
        totalAppts += vol.count;

        // Find this service's margin for this level
        const cell = serviceMatrix.find(m => m.levelId === levelId && m.serviceId === serviceId);
        if (cell) {
          weightedMargin += cell.marginPct * vol.count;
        }
      }

      const avgMargin = totalAppts > 0 ? weightedMargin / totalAppts : 0;
      const monthlyRevenue = totalRevenue / monthSpan;
      const monthlyProfit = monthlyRevenue * avgMargin;
      const hourlyContribution = assumptions.hours_per_month > 0
        ? monthlyProfit / assumptions.hours_per_month
        : 0;

      stylistSnapshots.push({
        userId,
        fullName: staffNameMap.get(userId) || 'Unknown',
        levelId,
        levelLabel: level.label,
        totalRevenue,
        totalAppointments: totalAppts,
        weightedMarginPct: avgMargin,
        effectiveHourlyContribution: hourlyContribution,
        status: getStatus(avgMargin, assumptions.target_margin_pct),
        hasEnoughData: totalAppts >= MIN_APPOINTMENTS_PER_STYLIST,
      });
    }

    // Sort by contribution (lowest first)
    stylistSnapshots.sort((a, b) => a.effectiveHourlyContribution - b.effectiveHourlyContribution);

    return {
      levelSummaries,
      serviceMatrix,
      stylistSnapshots,
      dateRange,
      totalAppointments: appointments.length,
      isLoading,
    };
  }, [rawData, levels, assumptions, whatIfRates, isLoading]);

  return result;
}
