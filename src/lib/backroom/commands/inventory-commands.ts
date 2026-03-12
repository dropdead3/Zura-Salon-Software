/**
 * Inventory Commands — Typed command objects + handlers.
 *
 * Each handler: fetches state → validates (pure) → delegates to InventoryLedgerService → audits.
 */

import type { CommandMeta, CommandResult } from './types';
import { logCommandAudit, rejected, succeeded } from './types';
import {
  postUsageFromSession,
  postLedgerEntry,
  postTransfer,
  type LedgerEntry,
} from '../services/inventory-ledger-service';
import {
  validatePostUsageDepletion,
  validateCreateCountAdjustment,
  validateCreateTransfer,
  validatePostWaste,
} from './inventory-validators';
import { supabase } from '@/integrations/supabase/client';

// ─── Command Definitions ─────────────────────────────

export interface PostUsageDepletionCommand {
  meta: CommandMeta;
  organization_id: string;
  session_id: string;
  location_id?: string;
}

export interface CreateCountAdjustmentCommand {
  meta: CommandMeta;
  organization_id: string;
  product_id: string;
  quantity_change: number;
  reason: string;
  location_id?: string;
  notes?: string;
}

export interface CreateTransferCommand {
  meta: CommandMeta;
  organization_id: string;
  product_id: string;
  quantity: number;
  from_location_id: string;
  to_location_id: string;
  transfer_id: string;
}

export interface PostWasteCommand {
  meta: CommandMeta;
  organization_id: string;
  product_id: string;
  quantity: number;
  reason: string;
  location_id?: string;
  notes?: string;
}

// ─── State Fetchers ──────────────────────────────────

async function checkSessionState(sessionId: string): Promise<{ exists: boolean; completed: boolean }> {
  const { data } = await supabase
    .from('mix_sessions' as any)
    .select('id, status')
    .eq('id', sessionId)
    .single();

  if (!data) return { exists: false, completed: false };
  return { exists: true, completed: (data as any).status === 'completed' };
}

async function checkProductExists(productId: string): Promise<boolean> {
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('id', productId);
  return (count ?? 0) > 0;
}

// ─── Command Handlers ────────────────────────────────

export async function executePostUsageDepletion(
  cmd: PostUsageDepletionCommand,
): Promise<CommandResult<{ movementsInserted: number }>> {
  const sessionState = await checkSessionState(cmd.session_id);
  const errors = validatePostUsageDepletion(
    cmd.meta.initiated_by,
    sessionState.exists,
    sessionState.completed,
    cmd.organization_id,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'PostUsageDepletion',
      command_payload: { session_id: cmd.session_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  const result = await postUsageFromSession({
    sessionId: cmd.session_id,
    organizationId: cmd.organization_id,
    locationId: cmd.location_id,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'PostUsageDepletion',
    command_payload: { session_id: cmd.session_id, movements: result.movementsInserted },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'mix_session',
    result_entity_id: cmd.session_id,
  });

  return succeeded(cmd.meta.idempotency_key, result);
}

export async function executeCreateCountAdjustment(
  cmd: CreateCountAdjustmentCommand,
): Promise<CommandResult> {
  const productExists = await checkProductExists(cmd.product_id);
  const errors = validateCreateCountAdjustment(
    cmd.meta.initiated_by,
    productExists,
    cmd.quantity_change,
    cmd.reason,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'CreateCountAdjustment',
      command_payload: { product_id: cmd.product_id, quantity_change: cmd.quantity_change },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  await postLedgerEntry({
    organization_id: cmd.organization_id,
    product_id: cmd.product_id,
    quantity_change: cmd.quantity_change,
    quantity_after: 0, // trigger recalculates
    event_type: 'count',
    reason: cmd.reason,
    location_id: cmd.location_id ?? null,
    notes: cmd.notes ?? null,
    created_by: cmd.meta.initiated_by,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'CreateCountAdjustment',
    command_payload: { product_id: cmd.product_id, quantity_change: cmd.quantity_change, reason: cmd.reason },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'stock_movement',
    result_entity_id: cmd.product_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}

export async function executeCreateTransfer(
  cmd: CreateTransferCommand,
): Promise<CommandResult> {
  const productExists = await checkProductExists(cmd.product_id);
  const errors = validateCreateTransfer(
    cmd.meta.initiated_by,
    productExists,
    cmd.quantity,
    cmd.from_location_id,
    cmd.to_location_id,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'CreateTransfer',
      command_payload: { product_id: cmd.product_id, quantity: cmd.quantity },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  await postTransfer({
    organizationId: cmd.organization_id,
    productId: cmd.product_id,
    quantity: cmd.quantity,
    fromLocationId: cmd.from_location_id,
    toLocationId: cmd.to_location_id,
    transferId: cmd.transfer_id,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'CreateTransfer',
    command_payload: { product_id: cmd.product_id, quantity: cmd.quantity, transfer_id: cmd.transfer_id },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'stock_transfer',
    result_entity_id: cmd.transfer_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}

export async function executePostWaste(
  cmd: PostWasteCommand,
): Promise<CommandResult> {
  const productExists = await checkProductExists(cmd.product_id);
  const errors = validatePostWaste(
    cmd.meta.initiated_by,
    productExists,
    cmd.quantity,
    cmd.reason,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'PostWaste',
      command_payload: { product_id: cmd.product_id, quantity: cmd.quantity },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  await postLedgerEntry({
    organization_id: cmd.organization_id,
    product_id: cmd.product_id,
    quantity_change: -cmd.quantity,
    quantity_after: 0, // trigger recalculates
    event_type: 'waste',
    reason: cmd.reason,
    location_id: cmd.location_id ?? null,
    notes: cmd.notes ?? null,
    created_by: cmd.meta.initiated_by,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'PostWaste',
    command_payload: { product_id: cmd.product_id, quantity: cmd.quantity, reason: cmd.reason },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'stock_movement',
    result_entity_id: cmd.product_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}
