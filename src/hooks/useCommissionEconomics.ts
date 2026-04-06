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
}

const DEFAULT_ASSUMPTIONS: EconomicsAssumptions = {
  target_margin_pct: 0.15,
  overhead_per_stylist: 4000,
  product_cost_pct: 0.10,
};

const SETTINGS_KEY = 'commission_economics_assumptions';

export function useEconomicsAssumptions() {
  const setting = useColorBarSetting(SETTINGS_KEY);

  const assumptions = useMemo<EconomicsAssumptions>(() => {
    if (!setting.data?.value || Object.keys(setting.data.value).length === 0) {
      return DEFAULT_ASSUMPTIONS;
    }
    const v = setting.data.value as Record<string, unknown>;
    return {
      target_margin_pct: typeof v.target_margin_pct === 'number' ? v.target_margin_pct : DEFAULT_ASSUMPTIONS.target_margin_pct,
      overhead_per_stylist: typeof v.overhead_per_stylist === 'number' ? v.overhead_per_stylist : DEFAULT_ASSUMPTIONS.overhead_per_stylist,
      product_cost_pct: typeof v.product_cost_pct === 'number' ? v.product_cost_pct : DEFAULT_ASSUMPTIONS.product_cost_pct,
    };
  }, [setting.data]);

  return { assumptions, isLoading: setting.isLoading };
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
      // Get all staff with their levels
      const { data: staff, error: staffErr } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level_id')
        .eq('organization_id', orgId!)
        .not('stylist_level_id', 'is', null);

      if (staffErr) throw staffErr;
      if (!staff || staff.length === 0) return [];

      // Get appointment revenue for last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const dateStr = ninetyDaysAgo.toISOString().slice(0, 10);

      const userIds = staff.map(s => s.user_id);
      const { data: appointments, error: apptErr } = await supabase
        .from('appointments')
        .select('staff_user_id, total_price')
        .eq('organization_id', orgId!)
        .gte('appointment_date', dateStr)
        .in('staff_user_id', userIds)
        .in('status', ['completed', 'checked_out']);

      if (apptErr) throw apptErr;

      // Group revenue by level
      const staffLevelMap = new Map(staff.map(s => [s.user_id, s.stylist_level_id]));
      const levelRevenue = new Map<string, { total: number; userIds: Set<string> }>();

      for (const appt of (appointments || [])) {
        if (!appt.staff_user_id || !appt.total_price) continue;
        const levelId = staffLevelMap.get(appt.staff_user_id);
        if (!levelId) continue;

        if (!levelRevenue.has(levelId)) {
          levelRevenue.set(levelId, { total: 0, userIds: new Set() });
        }
        const entry = levelRevenue.get(levelId)!;
        entry.total += appt.total_price;
        entry.userIds.add(appt.staff_user_id);
      }

      // Also count stylists with 0 revenue
      for (const s of staff) {
        if (s.stylist_level_id && !levelRevenue.has(s.stylist_level_id)) {
          levelRevenue.set(s.stylist_level_id, { total: 0, userIds: new Set([s.user_id]) });
        } else if (s.stylist_level_id) {
          levelRevenue.get(s.stylist_level_id)!.userIds.add(s.user_id);
        }
      }

      // Convert to monthly average per stylist (90 days ≈ 3 months)
      return Array.from(levelRevenue.entries()).map(([level_id, data]) => ({
        level_id,
        avg_monthly_revenue: data.userIds.size > 0
          ? (data.total / 3) / data.userIds.size
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
 */
export function computeEconomics(
  serviceCommissionRate: number,
  assumptions: EconomicsAssumptions
) {
  const { overhead_per_stylist, product_cost_pct, target_margin_pct } = assumptions;
  const variableCostRate = serviceCommissionRate + product_cost_pct;

  // Revenue needed just to cover costs (0% margin)
  const breakevenDenominator = 1 - variableCostRate;
  const breakevenRevenue = breakevenDenominator > 0
    ? overhead_per_stylist / breakevenDenominator
    : Infinity;

  // Revenue needed to hit target margin
  const targetDenominator = 1 - variableCostRate - target_margin_pct;
  const targetRevenue = targetDenominator > 0
    ? overhead_per_stylist / targetDenominator
    : Infinity;

  return { breakevenRevenue, targetRevenue };
}

/**
 * Compute margin at actual revenue.
 */
export function computeMarginAtRevenue(
  revenue: number,
  serviceCommissionRate: number,
  assumptions: EconomicsAssumptions
): number {
  if (revenue <= 0) return -1;
  const { overhead_per_stylist, product_cost_pct } = assumptions;
  const variableCost = revenue * (serviceCommissionRate + product_cost_pct);
  const profit = revenue - variableCost - overhead_per_stylist;
  return profit / revenue;
}
