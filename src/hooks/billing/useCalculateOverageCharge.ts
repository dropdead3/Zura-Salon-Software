/**
 * useCalculateOverageCharge — On session completion, looks up allowance policy,
 * computes overage, and inserts a checkout_usage_charges record.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateOverageCharge, type OverageRateType } from '@/lib/backroom/allowance-billing';
import { toast } from 'sonner';

interface OverageChargeParams {
  sessionId: string;
  appointmentId: string;
  organizationId: string;
  serviceId?: string;
  serviceName?: string;
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
      if (!serviceId) return null;

      // 1. Look up allowance policy for this service
      const { data: policy, error: policyErr } = await supabase
        .from('service_allowance_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('service_id', serviceId)
        .eq('is_active', true)
        .maybeSingle();

      if (policyErr) throw policyErr;
      if (!policy) return null; // No policy → no charge

      // 2. Aggregate actual usage from non-discarded bowls
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

      // 3. Calculate overage
      const result = calculateOverageCharge({
        includedAllowanceQty: Number(policy.included_allowance_qty),
        actualUsageQty: actualUsage,
        overageRate: Number(policy.overage_rate),
        overageRateType: (policy.overage_rate_type ?? 'per_unit') as OverageRateType,
        overageCap: policy.overage_cap != null ? Number(policy.overage_cap) : null,
      });

      if (!result.isOverage) return { ...result, chargeId: null };

      // 4. Insert checkout_usage_charges
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
          status: 'pending',
        })
        .select()
        .single();

      if (chargeErr) throw chargeErr;

      return { ...result, chargeId: charge.id };
    },
    onSuccess: (result) => {
      if (result?.isOverage && result.chargeAmount > 0) {
        queryClient.invalidateQueries({ queryKey: ['checkout-usage-charges'] });
        toast.info(`Overage charge of $${result.chargeAmount.toFixed(2)} pending approval`);
      }
    },
    onError: (error) => {
      console.error('Overage charge calculation failed:', error);
      toast.error('Failed to calculate overage charge');
    },
  });
}
