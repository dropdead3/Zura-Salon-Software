/**
 * useAutoDetectEconomics — Computes smart default assumptions from org data.
 * Queries appointments, employee_profiles, and backroom_settings to produce
 * suggested values with source labels ('data' | 'estimate').
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { getServiceCategory } from '@/utils/serviceCategorization';
import type { EconomicsAssumptions } from './useCommissionEconomics';

export type SourceType = 'data' | 'estimate';

export interface AutoDetectResult {
  suggestions: EconomicsAssumptions;
  sources: Record<keyof EconomicsAssumptions, SourceType>;
  details: {
    stylistCount: number;
    totalAppointmentHours: number;
    colorHeavy: boolean;
    hasChemicalData: boolean;
    computedProductCostPct: number | null;
  };
}

/** Industry benchmark ranges for display */
export const BENCHMARKS = {
  overhead_per_stylist: { min: 3200, max: 5500, label: 'Typical: $3,200–$5,500/mo' },
  product_cost_pct: { min: 0.05, max: 0.18, label: 'Typical: 5–18%' },
  target_margin_pct: { min: 0.08, max: 0.15, label: 'Typical: 8–15%' },
  hours_per_month: { min: 130, max: 180, label: 'Typical: 130–180 hrs' },
} as const;

export function useAutoDetectEconomics() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['auto-detect-economics', orgId],
    queryFn: async (): Promise<AutoDetectResult> => {
      const sources: Record<keyof EconomicsAssumptions, SourceType> = {
        overhead_per_stylist: 'estimate',
        product_cost_pct: 'estimate',
        target_margin_pct: 'estimate',
        hours_per_month: 'estimate',
      };

      // 1. Stylist count
      const { data: stylists } = await supabase
        .from('employee_profiles')
        .select('user_id')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true);

      const { data: stylistRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', (stylists ?? []).map(s => s.user_id))
        .eq('role', 'stylist');

      const stylistCount = stylistRoles?.length ?? 0;

      // 2. Appointment data (90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const dateStr = ninetyDaysAgo.toISOString().slice(0, 10);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('duration_minutes, total_price, service_name, service_category')
        .eq('organization_id', orgId!)
        .gte('appointment_date', dateStr)
        .in('status', ['completed', 'checked_out']);

      const appts = appointments ?? [];

      // 3. Hours per month
      let hoursPerMonth = 160; // fallback
      if (appts.length > 0 && stylistCount > 0) {
        const totalMinutes = appts.reduce((sum, a) => sum + (a.duration_minutes ?? 0), 0);
        const totalHours = totalMinutes / 60;
        hoursPerMonth = Math.round(totalHours / stylistCount / 3); // 3 months
        if (hoursPerMonth > 10) {
          sources.hours_per_month = 'data';
        } else {
          hoursPerMonth = 160; // too low, use fallback
        }
      }

      // 4. Service mix analysis for product cost
      let colorServiceCount = 0;
      let totalServiceCount = appts.length;
      for (const a of appts) {
        const cat = a.service_category || getServiceCategory(a.service_name);
        if (cat === 'Color' || cat === 'Blonding') {
          colorServiceCount++;
        }
      }
      const colorRatio = totalServiceCount > 0 ? colorServiceCount / totalServiceCount : 0;
      const colorHeavy = colorRatio > 0.3;

      // 5. Try to get actual chemical cost data from backroom
      let computedProductCostPct: number | null = null;
      let hasChemicalData = false;

      // Check if there are backroom analytics snapshots with cost data
      const { data: snapshots } = await supabase
        .from('backroom_analytics_snapshots')
        .select('total_product_cost, total_service_revenue')
        .eq('organization_id', orgId!)
        .gte('snapshot_date', dateStr)
        .order('snapshot_date', { ascending: false })
        .limit(90);

      if (snapshots && snapshots.length > 0) {
        const totalCost = snapshots.reduce((s, r) => s + (r.total_product_cost ?? 0), 0);
        const totalRev = snapshots.reduce((s, r) => s + (r.total_service_revenue ?? 0), 0);
        if (totalRev > 0 && totalCost > 0) {
          computedProductCostPct = totalCost / totalRev;
          hasChemicalData = true;
          sources.product_cost_pct = 'data';
        }
      }

      // Determine product cost %
      let productCostPct: number;
      if (computedProductCostPct !== null) {
        productCostPct = Math.round(computedProductCostPct * 1000) / 1000; // 3 decimal precision
      } else if (totalServiceCount > 20) {
        // Enough data to infer from service mix
        productCostPct = colorHeavy ? 0.12 : 0.06;
        sources.product_cost_pct = totalServiceCount > 50 ? 'data' : 'estimate';
      } else {
        productCostPct = 0.10; // generic default
      }

      // 6. Overhead — estimate from industry median
      const overheadPerStylist = 3500; // industry median

      // 7. Target margin — default 15%
      const targetMarginPct = 0.15;

      return {
        suggestions: {
          overhead_per_stylist: overheadPerStylist,
          product_cost_pct: productCostPct,
          target_margin_pct: targetMarginPct,
          hours_per_month: hoursPerMonth,
        },
        sources,
        details: {
          stylistCount,
          totalAppointmentHours: appts.reduce((s, a) => s + (a.duration_minutes ?? 0), 0) / 60,
          colorHeavy,
          hasChemicalData,
          computedProductCostPct,
        },
      };
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000,
  });
}
