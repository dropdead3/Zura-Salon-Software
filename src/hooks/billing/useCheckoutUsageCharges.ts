/**
 * useCheckoutUsageCharges — Fetch, approve, and waive overage charges for checkout.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CheckoutUsageCharge {
  id: string;
  organization_id: string;
  appointment_id: string;
  mix_session_id: string;
  policy_id: string | null;
  service_name: string | null;
  included_allowance_qty: number;
  actual_usage_qty: number;
  overage_qty: number;
  overage_rate: number;
  charge_amount: number;
  charge_type: string;
  product_wholesale_cost: number | null;
  product_charge_markup_pct: number | null;
  status: string;
  waived_by: string | null;
  waived_reason: string | null;
  approved_by: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCheckoutUsageCharges(appointmentId: string | null) {
  return useQuery({
    queryKey: ['checkout-usage-charges', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkout_usage_charges')
        .select('*')
        .eq('appointment_id', appointmentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CheckoutUsageCharge[];
    },
    enabled: !!appointmentId,
  });
}

export function useApproveOverageCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chargeId, organizationId }: { chargeId: string; organizationId: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Update charge status
      const { data: charge, error: chargeErr } = await supabase
        .from('checkout_usage_charges')
        .update({ status: 'approved', approved_by: userId })
        .eq('id', chargeId)
        .select()
        .single();

      if (chargeErr) throw chargeErr;

      // Log to audit trail
      const { error: logErr } = await supabase
        .from('allowance_override_log')
        .insert({
          organization_id: organizationId,
          charge_id: chargeId,
          action: 'approved',
          previous_amount: charge.charge_amount,
          new_amount: charge.charge_amount,
          performed_by: userId,
        });

      if (logErr) console.error('Failed to log approval:', logErr);

      return charge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-usage-charges'] });
      toast.success('Overage charge approved');
    },
    onError: (error) => {
      toast.error('Failed to approve charge: ' + error.message);
    },
  });
}

export function useWaiveOverageCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chargeId,
      organizationId,
      reason,
    }: {
      chargeId: string;
      organizationId: string;
      reason: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get current charge for audit
      const { data: current, error: fetchErr } = await supabase
        .from('checkout_usage_charges')
        .select('charge_amount')
        .eq('id', chargeId)
        .single();

      if (fetchErr) throw fetchErr;

      // Update charge status
      const { error: chargeErr } = await supabase
        .from('checkout_usage_charges')
        .update({
          status: 'waived',
          waived_by: userId,
          waived_reason: reason,
        })
        .eq('id', chargeId);

      if (chargeErr) throw chargeErr;

      // Log to audit trail
      const { error: logErr } = await supabase
        .from('allowance_override_log')
        .insert({
          organization_id: organizationId,
          charge_id: chargeId,
          action: 'waived',
          previous_amount: current.charge_amount,
          new_amount: 0,
          reason,
          performed_by: userId,
        });

      if (logErr) console.error('Failed to log waiver:', logErr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-usage-charges'] });
      toast.success('Overage charge waived');
    },
    onError: (error) => {
      toast.error('Failed to waive charge: ' + error.message);
    },
  });
}
