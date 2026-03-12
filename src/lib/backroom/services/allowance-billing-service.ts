/**
 * AllowanceBillingService — Owns checkout_usage_projections writes.
 *
 * Wraps the pure calculateOverageCharge() calculation and persists
 * the result to the checkout_usage_projections table.
 *
 * Must not directly mutate mix_sessions or inventory.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calculateOverageCharge,
  type AllowanceBillingInput,
  type AllowanceBillingResult,
} from '@/lib/backroom/allowance-billing';

export interface ComputeCheckoutParams {
  organization_id: string;
  mix_session_id: string;
  appointment_id?: string | null;
  appointment_service_id?: string | null;
  client_id?: string | null;
  total_dispensed_weight: number;
  total_dispensed_cost: number;
  billing_input: AllowanceBillingInput;
  requires_manager_review?: boolean;
}

export interface CheckoutProjectionResult extends AllowanceBillingResult {
  projection_id: string;
}

/**
 * Compute overage charge and upsert the checkout_usage_projection.
 */
export async function computeAndStoreCheckoutProjection(
  params: ComputeCheckoutParams
): Promise<CheckoutProjectionResult> {
  const billing = calculateOverageCharge(params.billing_input);

  const row = {
    organization_id: params.organization_id,
    mix_session_id: params.mix_session_id,
    appointment_id: params.appointment_id ?? null,
    appointment_service_id: params.appointment_service_id ?? null,
    client_id: params.client_id ?? null,
    total_dispensed_weight: params.total_dispensed_weight,
    total_dispensed_cost: params.total_dispensed_cost,
    service_allowance_grams: params.billing_input.includedAllowanceQty,
    overage_grams: billing.overageQty,
    overage_charge: billing.chargeAmount,
    requires_manager_review: params.requires_manager_review ?? false,
    last_calculated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('checkout_usage_projections' as any)
    .upsert(row as any, { onConflict: 'organization_id,mix_session_id' })
    .select('id')
    .single();

  if (error) throw error;

  return {
    ...billing,
    projection_id: (data as any).id,
  };
}
