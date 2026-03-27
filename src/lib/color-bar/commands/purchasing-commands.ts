/**
 * Purchasing Commands — Typed command objects + handlers.
 */

import type { CommandMeta, CommandResult } from './types';
import { logCommandAudit, rejected, succeeded } from './types';
import { receiveShipment, type ReceiveShipmentInput, type ReceivingLineInput } from '../services/purchasing-service';
import { validateReceiveShipment } from './purchasing-validators';
import { supabase } from '@/integrations/supabase/client';

// ─── Command Definitions ─────────────────────────────

export interface ReceiveShipmentCommand {
  meta: CommandMeta;
  organization_id: string;
  purchase_order_id: string;
  notes?: string;
  lines: ReceivingLineInput[];
}

// ─── State Fetchers ──────────────────────────────────

async function fetchPOState(poId: string): Promise<{ exists: boolean; status: string | null }> {
  const { data } = await supabase
    .from('purchase_orders')
    .select('id, status')
    .eq('id', poId)
    .single();

  if (!data) return { exists: false, status: null };
  return { exists: true, status: (data as any).status };
}

// ─── Command Handler ─────────────────────────────────

export async function executeReceiveShipment(
  cmd: ReceiveShipmentCommand,
): Promise<CommandResult<{ receivingRecordId: string; receivingStatus: string }>> {
  const poState = await fetchPOState(cmd.purchase_order_id);
  const errors = validateReceiveShipment(
    cmd.meta.initiated_by,
    poState.exists,
    poState.status,
    cmd.lines,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'ReceiveShipment',
      command_payload: { purchase_order_id: cmd.purchase_order_id, line_count: cmd.lines.length },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  const result = await receiveShipment({
    organization_id: cmd.organization_id,
    purchase_order_id: cmd.purchase_order_id,
    notes: cmd.notes,
    lines: cmd.lines,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'ReceiveShipment',
    command_payload: { purchase_order_id: cmd.purchase_order_id, line_count: cmd.lines.length },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'receiving_record',
    result_entity_id: result.receivingRecordId,
  });

  return succeeded(cmd.meta.idempotency_key, result);
}
