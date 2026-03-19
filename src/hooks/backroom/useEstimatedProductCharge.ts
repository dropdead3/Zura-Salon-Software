/**
 * useEstimatedProductCharge — Estimates product cost charges for the booking wizard.
 *
 * For each service in a booking that uses 'parts_and_labor' billing mode,
 * joins service formula baselines → products to compute:
 *   SUM(expected_qty × cost_per_gram × (1 + markup_pct / 100))
 *
 * Falls back to org-level default_product_markup_pct when per-product markup is null.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateProductCostCharge } from '@/lib/backroom/allowance-billing';

export interface ServiceProductEstimate {
  serviceId: string;
  serviceName: string;
  wholesaleCost: number;
  markupPct: number;
  chargeAmount: number;
  profitMargin: number;
  hasBaselines: boolean;
}

export interface EstimatedProductChargeResult {
  isEnabled: boolean;
  totalEstimatedCharge: number;
  totalWholesaleCost: number;
  totalProfitMargin: number;
  serviceBreakdown: ServiceProductEstimate[];
}

export function useEstimatedProductCharge(
  organizationId: string | null | undefined,
  serviceIds: string[]
) {
  return useQuery({
    queryKey: ['estimated-product-charge', organizationId, serviceIds],
    queryFn: async (): Promise<EstimatedProductChargeResult> => {
      const emptyResult: EstimatedProductChargeResult = {
        isEnabled: false,
        totalEstimatedCharge: 0,
        totalWholesaleCost: 0,
        totalProfitMargin: 0,
        serviceBreakdown: [],
      };

      if (!organizationId || serviceIds.length === 0) return emptyResult;

      // 1. Check which services have parts_and_labor policies
      const { data: policies } = await supabase
        .from('service_allowance_policies')
        .select('service_id, billing_mode')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('service_id', serviceIds);

      const plServices = (policies ?? []).filter(
        (p: any) => p.billing_mode === 'parts_and_labor'
      );

      if (plServices.length === 0) return emptyResult;

      const plServiceIds = plServices.map((p: any) => p.service_id);

      // 2. Get org-level default markup
      const { data: billingSettings } = await supabase
        .from('backroom_billing_settings' as any)
        .select('default_product_markup_pct')
        .eq('organization_id', organizationId)
        .maybeSingle();

      const orgDefaultMarkup = (billingSettings as any)?.default_product_markup_pct ?? 0;

      // 3. Get recipe baselines for these services
      const { data: baselines } = await supabase
        .from('service_recipe_baselines')
        .select('service_id, product_id, expected_quantity')
        .eq('organization_id', organizationId)
        .in('service_id', plServiceIds);

      // 4. Get product cost + markup for referenced products
      const productIds = [...new Set((baselines ?? []).map((b: any) => b.product_id))];
      let productMap: Record<string, { cost_per_gram: number; markup_pct: number | null; name: string }> = {};

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, cost_per_gram, markup_pct, name')
          .in('id', productIds);

        for (const p of (products ?? []) as any[]) {
          productMap[p.id] = {
            cost_per_gram: p.cost_per_gram ?? 0,
            markup_pct: p.markup_pct,
            name: p.name,
          };
        }
      }

      // 5. Get service names
      const { data: serviceRows } = await supabase
        .from('services')
        .select('id, name')
        .in('id', plServiceIds);

      const serviceNameMap: Record<string, string> = {};
      for (const s of (serviceRows ?? []) as any[]) {
        serviceNameMap[s.id] = s.name;
      }

      // 6. Calculate per-service estimates
      const breakdown: ServiceProductEstimate[] = [];

      for (const serviceId of plServiceIds) {
        const serviceBaselines = (baselines ?? []).filter(
          (b: any) => b.service_id === serviceId
        );
        const hasBaselines = serviceBaselines.length > 0;

        let totalWholesale = 0;
        let effectiveMarkup = orgDefaultMarkup;

        if (hasBaselines) {
          let markupSum = 0;
          let markupCount = 0;

          for (const baseline of serviceBaselines) {
            const product = productMap[(baseline as any).product_id];
            if (!product) continue;

            const lineCost = (baseline as any).expected_quantity * product.cost_per_gram;
            totalWholesale += lineCost;

            const lineMarkup = product.markup_pct ?? orgDefaultMarkup;
            markupSum += lineMarkup;
            markupCount++;
          }

          // Weighted average markup (simple average across lines)
          effectiveMarkup = markupCount > 0 ? markupSum / markupCount : orgDefaultMarkup;
        }

        const result = calculateProductCostCharge({
          wholesaleCost: totalWholesale,
          markupPct: effectiveMarkup,
        });

        breakdown.push({
          serviceId,
          serviceName: serviceNameMap[serviceId] ?? 'Service',
          wholesaleCost: result.wholesaleCost,
          markupPct: result.markupPct,
          chargeAmount: result.chargeAmount,
          profitMargin: result.profitMargin,
          hasBaselines,
        });
      }

      return {
        isEnabled: true,
        totalEstimatedCharge: breakdown.reduce((s, b) => s + b.chargeAmount, 0),
        totalWholesaleCost: breakdown.reduce((s, b) => s + b.wholesaleCost, 0),
        totalProfitMargin: breakdown.reduce((s, b) => s + b.profitMargin, 0),
        serviceBreakdown: breakdown,
      };
    },
    enabled: !!organizationId && serviceIds.length > 0,
    staleTime: 60_000,
  });
}
