/**
 * Billing Commands — Typed command objects + handlers.
 */

import type { CommandMeta, CommandResult } from './types';
import { logCommandAudit, rejected, succeeded } from './types';
import {
  computeAndStoreCheckoutProjection,
  type ComputeCheckoutParams,
  type CheckoutProjectionResult,
} from '../services/allowance-billing-service';
import { validateComputeCheckoutCharge, validateApplyChargeOverride } from './billing-validators';
import { supabase } from '@/integrations/supabase/client';
import type { AllowanceBillingInput } from '../allowance-billing';

// ─── Command Definitions ─────────────────────────────

export interface ComputeCheckoutChargeCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  appointment_id?: string;
  appointment_service_id?: string;
  client_id?: string;
  total_dispensed_weight: number;
  total_dispensed_cost: number;
  billing_input: AllowanceBillingInput;
}

export interface ApplyChargeOverrideCommand {
  meta: CommandMeta;
  organization_id: string;
  projection_id: string;
  new_amount: number;
  reason: string;
}

// ─── State Fetchers ──────────────────────────────────

async function checkSessionCompleted(sessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('mix_sessions' as any)
    .select('status')
    .eq('id', sessionId)
    .single();
  return (data as any)?.status === 'completed';
}

async function checkProjectionExists(projectionId: string): Promise<boolean> {
  const { count } = await supabase
    .from('checkout_usage_projections' as any)
    .select('id', { count: 'exact', head: true })
    .eq('id', projectionId);
  return (count ?? 0) > 0;
}

async function checkIsManager(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles' as any)
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'manager', 'super_admin']);
  return (data as any[])?.length > 0;
}

// ─── Command Handlers ────────────────────────────────

export async function executeComputeCheckoutCharge(
  cmd: ComputeCheckoutChargeCommand,
): Promise<CommandResult<CheckoutProjectionResult>> {
  const sessionCompleted = await checkSessionCompleted(cmd.mix_session_id);
  const errors = validateComputeCheckoutCharge(
    cmd.meta.initiated_by,
    sessionCompleted,
    cmd.organization_id,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'ComputeCheckoutCharge',
      command_payload: { mix_session_id: cmd.mix_session_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  const result = await computeAndStoreCheckoutProjection({
    organization_id: cmd.organization_id,
    mix_session_id: cmd.mix_session_id,
    appointment_id: cmd.appointment_id,
    appointment_service_id: cmd.appointment_service_id,
    client_id: cmd.client_id,
    total_dispensed_weight: cmd.total_dispensed_weight,
    total_dispensed_cost: cmd.total_dispensed_cost,
    billing_input: cmd.billing_input,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'ComputeCheckoutCharge',
    command_payload: { mix_session_id: cmd.mix_session_id, overage_charge: result.chargeAmount },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'checkout_usage_projection',
    result_entity_id: result.projection_id,
  });

  return succeeded(cmd.meta.idempotency_key, result);
}

export async function executeApplyChargeOverride(
  cmd: ApplyChargeOverrideCommand,
): Promise<CommandResult> {
  const projectionExists = await checkProjectionExists(cmd.projection_id);
  const isManager = await checkIsManager(cmd.meta.initiated_by);
  const errors = validateApplyChargeOverride(
    cmd.meta.initiated_by,
    projectionExists,
    isManager,
    cmd.reason,
    cmd.new_amount,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'ApplyChargeOverride',
      command_payload: { projection_id: cmd.projection_id, new_amount: cmd.new_amount },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  // Apply override
  const { error } = await supabase
    .from('checkout_usage_projections' as any)
    .update({
      overage_charge: cmd.new_amount,
      requires_manager_review: false,
      last_calculated_at: new Date().toISOString(),
    } as any)
    .eq('id', cmd.projection_id);

  if (error) throw error;

  // Log to allowance_override_log
  await supabase.from('allowance_override_log').insert({
    organization_id: cmd.organization_id,
    charge_id: cmd.projection_id,
    action: 'override',
    previous_amount: null,
    new_amount: cmd.new_amount,
    reason: cmd.reason,
    performed_by: cmd.meta.initiated_by,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'ApplyChargeOverride',
    command_payload: { projection_id: cmd.projection_id, new_amount: cmd.new_amount, reason: cmd.reason },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'checkout_usage_projection',
    result_entity_id: cmd.projection_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}
