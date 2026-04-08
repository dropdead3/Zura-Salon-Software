/**
 * useCommissionEconomics — Assumptions CRUD + revenue-per-level query
 * for the Commission Economics (margin affordability) calculator.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useColorBarSetting, useUpsertColorBarSetting } from '@/hooks/color-bar/useColorBarSettings';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { StylistLevel } from '@/hooks/useStylistLevels';

export interface EconomicsAssumptions {
  target_margin_pct: number;       // e.g. 0.15 = 15%
  overhead_per_stylist: number;    // monthly $ overhead per stylist
  product_cost_pct: number;        // e.g. 0.10 = 10%
  hours_per_month: number;         // default 160, adjustable for part-time modeling
}

const DEFAULT_ASSUMPTIONS: EconomicsAssumptions = {
  target_margin_pct: 0.15,
  overhead_per_stylist: 4000,
  product_cost_pct: 0.10,
  hours_per_month: 160,
};

const SETTINGS_KEY = 'commission_economics_assumptions';

export function useEconomicsAssumptions() {
  const setting = useColorBarSetting(SETTINGS_KEY);

  const hasCustomAssumptions = useMemo(() => {
    return !!(setting.data?.value && Object.keys(setting.data.value).length > 0);
  }, [setting.data]);

  const assumptions = useMemo<EconomicsAssumptions>(() => {
    if (!hasCustomAssumptions) {
      return DEFAULT_ASSUMPTIONS;
    }
    const v = setting.data!.value as Record<string, unknown>;
    return {
      target_margin_pct: typeof v.target_margin_pct === 'number' ? v.target_margin_pct : DEFAULT_ASSUMPTIONS.target_margin_pct,
      overhead_per_stylist: typeof v.overhead_per_stylist === 'number' ? v.overhead_per_stylist : DEFAULT_ASSUMPTIONS.overhead_per_stylist,
      product_cost_pct: typeof v.product_cost_pct === 'number' ? v.product_cost_pct : DEFAULT_ASSUMPTIONS.product_cost_pct,
      hours_per_month: typeof v.hours_per_month === 'number' ? v.hours_per_month : DEFAULT_ASSUMPTIONS.hours_per_month,
    };
  }, [setting.data, hasCustomAssumptions]);

  return { assumptions, hasCustomAssumptions, isLoading: setting.isLoading };
}

export function useSaveEconomicsAssumptions() {
  const upsert = useUpsertColorBarSetting();
  const { effectiveOrganization } = useOrganizationContext();

  return {
    save: (assumptions: EconomicsAssumptions) => {
      if (!effectiveOrganization?.id) return;
      upsert.mutate({
        organization_id: effectiveOrganization.id,
        setting_key: SETTINGS_KEY,
        setting_value: assumptions as unknown as Record<string, unknown>,
      });
    },
    isPending: upsert.isPending,
  };
}

export interface LevelRevenueData {
  level_id: string;
  avg_monthly_revenue: number;
  stylist_count: number;
}

/**
 * Fetches trailing 90-day average monthly revenue per stylist,
 * grouped by their assigned level.
 */
export function useRevenueByLevel() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['commission-economics-revenue', orgId],
    queryFn: async (): Promise<LevelRevenueData[]> => {
      // Get all staff with their levels (stylist_level is a slug string)
      const { data: staff, error: staffErr } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level')
        .eq('organization_id', orgId!)
        .not('stylist_level', 'is', null);

      if (staffErr) throw staffErr;
      if (!staff || staff.length === 0) return [];

      // Get stylist_levels to map slugs → IDs
      const { data: levelRows } = await supabase
        .from('stylist_levels')
        .select('id, slug')
        .eq('organization_id', orgId!);
      const slugToId = new Map((levelRows || []).map(l => [l.slug, l.id]));

      // Get revenue from live POS transaction items for last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const dateStr = ninetyDaysAgo.toISOString().slice(0, 10);

      const userIds = staff.map(s => s.user_id);
      const allTxnItems: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error: txErr } = await supabase
          .from('phorest_transaction_items')
          .select('stylist_user_id, total_amount, tax_amount, item_type, transaction_date')
          .in('stylist_user_id', userIds)
          .gte('transaction_date', dateStr)
          .range(from, from + pageSize - 1);
        if (txErr) throw txErr;
        allTxnItems.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      // Group revenue by level ID
      const staffLevelMap = new Map<string, string>();
      for (const s of staff) {
        const levelId = s.stylist_level ? slugToId.get(s.stylist_level) : undefined;
        if (levelId) staffLevelMap.set(s.user_id, levelId);
      }

      const levelRevenue = new Map<string, { total: number; userIds: Set<string> }>();

      for (const item of allTxnItems) {
        if (!item.stylist_user_id) continue;
        const levelId = staffLevelMap.get(item.stylist_user_id);
        if (!levelId) continue;

        if (!levelRevenue.has(levelId)) {
          levelRevenue.set(levelId, { total: 0, userIds: new Set() });
        }
        const entry = levelRevenue.get(levelId)!;
        entry.total += (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        entry.userIds.add(item.stylist_user_id);
      }

      // Also count stylists with 0 revenue
      for (const s of staff) {
        const levelId = s.stylist_level ? slugToId.get(s.stylist_level) : undefined;
        if (levelId && !levelRevenue.has(levelId)) {
          levelRevenue.set(levelId, { total: 0, userIds: new Set([s.user_id]) });
        } else if (levelId) {
          levelRevenue.get(levelId)!.userIds.add(s.user_id);
        }
      }

      // Calculate actual month span from transaction date range
      let monthSpan = 3;
      if (allTxnItems.length > 0) {
        let minDate = '';
        let maxDate = '';
        for (const item of allTxnItems) {
          const d = (item.transaction_date || '').slice(0, 10);
          if (!d) continue;
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
        if (minDate && maxDate) {
          const startD = new Date(minDate);
          const endD = new Date(maxDate);
          const diffDays = Math.max(1, (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
          monthSpan = Math.max(1, diffDays / 30.44);
        }
      }

      // Convert to monthly average per stylist
      return Array.from(levelRevenue.entries()).map(([level_id, data]) => ({
        level_id,
        avg_monthly_revenue: data.userIds.size > 0
          ? (data.total / monthSpan) / data.userIds.size
          : 0,
        stylist_count: data.userIds.size,
      }));
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Core margin math: compute breakeven and target revenue for a given commission rate.
 * Includes both service and retail commission in variable cost calculation.
 */
export function computeEconomics(
  serviceCommissionRate: number,
  assumptions: EconomicsAssumptions,
  retailCommissionRate: number = 0,
  hourlyWageCost: number = 0
) {
  const { overhead_per_stylist, product_cost_pct, target_margin_pct } = assumptions;
  const totalFixedCost = overhead_per_stylist + hourlyWageCost;
  const variableCostRate = serviceCommissionRate + retailCommissionRate + product_cost_pct;

  // Guard: if variable costs eat ≥100% of revenue, no amount of revenue helps
  if (variableCostRate >= 1) {
    return { breakevenRevenue: Infinity, targetRevenue: Infinity };
  }

  // Revenue needed just to cover costs (0% margin)
  const breakevenDenominator = 1 - variableCostRate;
  const breakevenRevenue = breakevenDenominator > 0
    ? totalFixedCost / breakevenDenominator
    : Infinity;

  // Revenue needed to hit target margin
  const targetDenominator = 1 - variableCostRate - target_margin_pct;
  const targetRevenue = targetDenominator > 0
    ? totalFixedCost / targetDenominator
    : Infinity;

  return { breakevenRevenue, targetRevenue };
}

/**
 * Compute margin at actual revenue.
 * Includes both service and retail commission in variable cost calculation.
 */
export function computeMarginAtRevenue(
  revenue: number,
  serviceCommissionRate: number,
  assumptions: EconomicsAssumptions,
  retailCommissionRate: number = 0,
  hourlyWageCost: number = 0
): number {
  if (revenue <= 0) return -1;
  const { overhead_per_stylist, product_cost_pct } = assumptions;
  const totalFixedCost = overhead_per_stylist + hourlyWageCost;
  const variableCost = revenue * (serviceCommissionRate + retailCommissionRate + product_cost_pct);
  const profit = revenue - variableCost - totalFixedCost;
  return profit / revenue;
}

/** AI optimizer response types */
export interface AICommissionRecommendation {
  level_slug: string;
  current_service_rate: number;
  recommended_service_rate: number;
  current_retail_rate: number;
  recommended_retail_rate: number;
  rationale: string;
  projected_margin_at_current_revenue: number;
}

export interface AICommissionOptimizerResult {
  recommendations: AICommissionRecommendation[];
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}
