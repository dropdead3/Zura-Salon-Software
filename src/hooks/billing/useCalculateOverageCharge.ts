/**
 * useCalculateOverageCharge — On session completion, looks up allowance policy,
 * computes overage OR product cost charge, and inserts a checkout_usage_charges record.
 *
 * Supports two billing modes:
 * - 'allowance' (default): Charges only for usage above the included allowance
 * - 'parts_and_labor': Charges the full cost of all products used, with markup
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateOverageCharge,
  calculateProductCostCharge,
  type OverageRateType,
} from '@/lib/color-bar/allowance-billing';
import { toast } from 'sonner';

interface OverageChargeParams {
  sessionId: string;
  appointmentId: string;
  organizationId: string;
  serviceId?: string;
  serviceName?: string;
}

/**
 * Resolve a services table ID from a service name.
 * service_allowance_policies.service_id references the `services` table,
 * NOT `phorest_services`. Using phorest_services would silently return
 * mismatched UUIDs and break all policy lookups.
 */
async function resolveServiceId(serviceName: string, organizationId: string): Promise<string | null> {
  const { data } = await (supabase
    .from('services' as any)
    .select('id')
    .eq('name', serviceName)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle() as any);
  return (data as any)?.id ?? null;
}

export function useCalculateOverageCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      appointmentId,
      organizationId,
      serviceId,
      serviceName,
    }: OverageChargeParams) => {
      // Resolve serviceId from name if not provided
      let resolvedServiceId = serviceId;
      if (!resolvedServiceId && serviceName) {
        resolvedServiceId = await resolveServiceId(serviceName, organizationId) ?? undefined;
      }
      if (!resolvedServiceId) return null;

      // ─── Duplicate charge guard (idempotency) ────────────────
      let existingChargeQuery = supabase
        .from('checkout_usage_charges')
        .select('id')
        .eq('mix_session_id', sessionId)
        .eq('appointment_id', appointmentId);

      // Handle null vs empty string: use .is() for null, .eq() for actual values
      if (serviceName) {
        existingChargeQuery = existingChargeQuery.eq('service_name', serviceName);
      } else {
        existingChargeQuery = existingChargeQuery.is('service_name', null);
      }

      const { data: existingCharge } = await existingChargeQuery
        .limit(1)
        .maybeSingle();

      if (existingCharge) {
        console.log('Charge already exists for session, skipping:', sessionId);
        return null;
      }

      // 1. Look up allowance policy for this service
      const { data: policy, error: policyErr } = await supabase
        .from('service_allowance_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('service_id', resolvedServiceId)
        .eq('is_active', true)
        .maybeSingle();

      if (policyErr) throw policyErr;
      if (!policy) return null; // No policy → no charge

      const billingMode = (policy as any).billing_mode || 'allowance';

      // ─── Parts & Labor: full product cost pass-through ────────
      if (billingMode === 'parts_and_labor') {
        return await handlePartsAndLabor({
          sessionId,
          appointmentId,
          organizationId,
          serviceName,
          policy,
        });
      }

      // ─── Allowance mode (default) ────────────────────────────
      return await handleAllowanceMode({
        sessionId,
        appointmentId,
        organizationId,
        serviceName,
        policy,
      });
    },
    onSuccess: (result) => {
      if (!result) return;

      queryClient.invalidateQueries({ queryKey: ['checkout-usage-charges'] });

      if (result.chargeType === 'product_cost' && result.chargeAmount > 0) {
        toast.info(`Product charge of $${result.chargeAmount.toFixed(2)} pending approval`);
      } else if (result.isOverage && result.chargeAmount > 0) {
        toast.info(`Overage charge of $${result.chargeAmount.toFixed(2)} pending approval`);
      }
    },
    onError: (error) => {
      console.error('Overage charge calculation failed:', error);
      toast.error('Failed to calculate usage charge');
    },
  });
}

// ─── Allowance mode handler ─────────────────────────────────────

async function handleAllowanceMode({
  sessionId,
  appointmentId,
  organizationId,
  serviceName,
  policy,
}: {
  sessionId: string;
  appointmentId: string;
  organizationId: string;
  serviceName?: string;
  policy: any;
}) {
  // Aggregate actual usage from non-discarded bowls
  const { data: bowls, error: bowlErr } = await supabase
    .from('mix_bowls')
    .select('net_usage_weight, total_dispensed_weight')
    .eq('mix_session_id', sessionId)
    .neq('status', 'discarded');

  if (bowlErr) throw bowlErr;

  const actualUsage = (bowls ?? []).reduce(
    (sum: number, b: any) => sum + (b.net_usage_weight ?? b.total_dispensed_weight ?? 0),
    0
  );

  const result = calculateOverageCharge({
    includedAllowanceQty: Number(policy.included_allowance_qty),
    actualUsageQty: actualUsage,
    overageRate: Number(policy.overage_rate),
    overageRateType: (policy.overage_rate_type ?? 'per_unit') as OverageRateType,
    overageCap: policy.overage_cap != null ? Number(policy.overage_cap) : null,
  });

  if (!result.isOverage) return { ...result, chargeId: null, chargeType: 'overage' as const };

  const { data: charge, error: chargeErr } = await supabase
    .from('checkout_usage_charges')
    .insert({
      organization_id: organizationId,
      appointment_id: appointmentId,
      mix_session_id: sessionId,
      policy_id: policy.id,
      service_name: serviceName ?? null,
      included_allowance_qty: Number(policy.included_allowance_qty),
      actual_usage_qty: actualUsage,
      overage_qty: result.overageQty,
      overage_rate: Number(policy.overage_rate),
      charge_amount: result.chargeAmount,
      charge_type: 'overage',
      status: 'pending',
    })
    .select()
    .single();

  if (chargeErr) throw chargeErr;

  return { ...result, chargeId: charge.id, chargeType: 'overage' as const };
}

// ─── Parts & Labor mode handler ─────────────────────────────────

async function handlePartsAndLabor({
  sessionId,
  appointmentId,
  organizationId,
  serviceName,
  policy,
}: {
  sessionId: string;
  appointmentId: string;
  organizationId: string;
  serviceName?: string;
  policy: any;
}) {
  // 1. Get org-level default markup
  const { data: billingSettings } = await supabase
    .from('backroom_billing_settings')
    .select('default_product_markup_pct')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const orgDefaultMarkup = billingSettings?.default_product_markup_pct ?? 0;

  // 2. Get non-discarded bowl IDs for this session, then aggregate line costs
  const { data: bowls, error: bowlErr } = await supabase
    .from('mix_bowls')
    .select('id')
    .eq('mix_session_id', sessionId)
    .neq('status', 'discarded');

  if (bowlErr) throw bowlErr;

  const bowlIds = (bowls ?? []).map(b => b.id);
  if (bowlIds.length === 0) {
    return { isOverage: false, chargeAmount: 0, chargeId: null, chargeType: 'product_cost' as const, overageQty: 0, unusedAllowance: 0 };
  }

  const { data: bowlLines, error: lineErr } = await supabase
    .from('mix_bowl_lines')
    .select('dispensed_quantity, product_id, dispensed_cost_snapshot')
    .in('bowl_id', bowlIds);

  if (lineErr) throw lineErr;

  if (!bowlLines || bowlLines.length === 0) {
    return { isOverage: false, chargeAmount: 0, chargeId: null, chargeType: 'product_cost' as const, overageQty: 0, unusedAllowance: 0 };
  }

  // 3. Get per-product markup for referenced products
  const productIds = [...new Set((bowlLines as any[]).map(l => l.product_id).filter(Boolean))];
  let productMarkupMap: Record<string, number | null> = {};

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, markup_pct')
      .in('id', productIds);

    for (const p of (products ?? []) as any[]) {
      productMarkupMap[p.id] = p.markup_pct;
    }
  }

  // 4. Calculate total wholesale cost and weighted markup
  // dispensed_cost_snapshot is per-unit cost; multiply by dispensed_quantity for line total
  let totalWholesaleCost = 0;
  let totalActualUsage = 0;

  for (const line of bowlLines as any[]) {
    const qty = line.dispensed_quantity ?? 0;
    const unitCost = line.dispensed_cost_snapshot ?? 0;
    totalWholesaleCost += qty * unitCost;
    totalActualUsage += qty;
  }

  // Determine effective markup: average of per-product markups, falling back to org default
  const markups = productIds
    .map(id => productMarkupMap[id] ?? orgDefaultMarkup)
    .filter(m => m !== null) as number[];
  const effectiveMarkup = markups.length > 0
    ? markups.reduce((s, m) => s + m, 0) / markups.length
    : orgDefaultMarkup;

  // 5. Calculate charge
  const costResult = calculateProductCostCharge({
    wholesaleCost: totalWholesaleCost,
    markupPct: effectiveMarkup,
  });

  if (costResult.chargeAmount <= 0) {
    return { isOverage: false, chargeAmount: 0, chargeId: null, chargeType: 'product_cost' as const, overageQty: 0, unusedAllowance: 0 };
  }

  // 6. Insert charge record
  const { data: charge, error: chargeErr } = await supabase
    .from('checkout_usage_charges')
    .insert({
      organization_id: organizationId,
      appointment_id: appointmentId,
      mix_session_id: sessionId,
      policy_id: policy.id,
      service_name: serviceName ?? null,
      included_allowance_qty: 0,
      actual_usage_qty: totalActualUsage,
      overage_qty: 0,
      overage_rate: 0,
      charge_amount: costResult.chargeAmount,
      charge_type: 'product_cost',
      product_wholesale_cost: costResult.wholesaleCost,
      product_charge_markup_pct: costResult.markupPct,
      status: 'pending',
    })
    .select()
    .single();

  if (chargeErr) throw chargeErr;

  return {
    isOverage: false,
    chargeAmount: costResult.chargeAmount,
    chargeId: charge.id,
    chargeType: 'product_cost' as const,
    overageQty: 0,
    unusedAllowance: 0,
    wholesaleCost: costResult.wholesaleCost,
    profitMargin: costResult.profitMargin,
    markupPct: costResult.markupPct,
  };
}
