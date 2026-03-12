/**
 * Mixing Commands — Typed command objects + handlers.
 *
 * Each handler: fetches state → validates (pure) → delegates to MixSessionService → audits.
 */

import type { CommandMeta, CommandResult } from './types';
import { logCommandAudit, rejected, succeeded } from './types';
import {
  emitSessionEvent,
  fetchSessionProjection,
  type MixSessionEventType,
  type SessionStatus,
} from '../mix-session-service';
import {
  validateStartMixSession,
  validateCreateBowl,
  validateCaptureWeight,
  validateRecordLineItem,
  validateRemoveLineItem,
  validateSealBowl,
  validateCaptureReweigh,
  validateCompleteSession,
  validateMarkSessionUnresolved,
} from './mixing-validators';
import { supabase } from '@/integrations/supabase/client';

// ─── Command Definitions ─────────────────────────────

export interface StartMixSessionCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
}

export interface CreateBowlCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  bowl_payload?: Record<string, unknown>;
}

export interface CaptureWeightCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  bowl_id: string;
  weight: number;
  unit: string;
  capture_method: 'scale' | 'manual';
  is_manual_override?: boolean;
}

export interface RecordLineItemCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  bowl_id: string;
  product_id: string;
  quantity: number;
  unit?: string;
}

export interface RemoveLineItemCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  bowl_id: string;
  line_id: string;
}

export interface SealBowlCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  bowl_id: string;
}

export interface CaptureReweighCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  bowl_id: string;
  weight: number;
  unit?: string;
}

export interface CompleteSessionCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
}

export interface MarkSessionUnresolvedCommand {
  meta: CommandMeta;
  organization_id: string;
  mix_session_id: string;
  reason?: string;
}

// ─── State Fetchers (thin queries) ───────────────────

async function fetchSessionState(sessionId: string) {
  const projection = await fetchSessionProjection(sessionId);
  if (!projection) return null;
  return {
    id: sessionId,
    current_status: (projection as any).current_status as SessionStatus,
  };
}

async function fetchBowlState(bowlId: string) {
  const { data } = await supabase
    .from('mix_bowls')
    .select('id, status, mix_session_id')
    .eq('id', bowlId)
    .single();
  if (!data) return null;

  // Get line count
  const { count } = await supabase
    .from('mix_bowl_lines')
    .select('id', { count: 'exact', head: true })
    .eq('bowl_id', bowlId);

  return {
    id: (data as any).id,
    status: (data as any).status,
    line_count: count ?? 0,
  };
}

async function checkLineExists(lineId: string): Promise<boolean> {
  const { count } = await supabase
    .from('mix_bowl_lines')
    .select('id', { count: 'exact', head: true })
    .eq('id', lineId);
  return (count ?? 0) > 0;
}

async function allBowlsTerminal(sessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('mix_bowls')
    .select('status')
    .eq('mix_session_id', sessionId);
  if (!data?.length) return false;
  return (data as any[]).every(
    (b) => b.status === 'reweighed' || b.status === 'discarded',
  );
}

// ─── Generic emit helper ─────────────────────────────

async function emitAndAudit(
  commandName: string,
  meta: CommandMeta,
  organizationId: string,
  sessionId: string,
  eventType: MixSessionEventType,
  currentStatus: SessionStatus,
  payload?: Record<string, unknown>,
  locationId?: string,
): Promise<CommandResult<unknown>> {
  const event = await emitSessionEvent(
    {
      mix_session_id: sessionId,
      organization_id: organizationId,
      event_type: eventType,
      event_payload: payload,
      source_mode: meta.source === 'ui' ? 'manual' : 'system',
      device_id: meta.device_id,
      station_id: meta.station_id,
    },
    currentStatus,
  );

  await logCommandAudit({
    organization_id: organizationId,
    command_name: commandName,
    command_payload: { session_id: sessionId, event_type: eventType, ...payload },
    meta,
    outcome: 'executed',
    result_entity_type: 'mix_session_event',
    result_entity_id: (event as any)?.id,
  });

  return succeeded(meta.idempotency_key, event);
}

// ─── Command Handlers ────────────────────────────────

export async function executeStartMixSession(
  cmd: StartMixSessionCommand,
): Promise<CommandResult<unknown>> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const errors = validateStartMixSession(cmd.meta.initiated_by, session);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'StartMixSession',
      command_payload: { mix_session_id: cmd.mix_session_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'StartMixSession',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'session_started',
    session!.current_status,
  );
}

export async function executeCreateBowl(
  cmd: CreateBowlCommand,
): Promise<CommandResult<unknown>> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const errors = validateCreateBowl(cmd.meta.initiated_by, session);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'CreateBowl',
      command_payload: { mix_session_id: cmd.mix_session_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'CreateBowl',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'bowl_created',
    session!.current_status,
    cmd.bowl_payload,
  );
}

export async function executeCaptureWeight(
  cmd: CaptureWeightCommand,
): Promise<CommandResult<unknown>> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const bowl = await fetchBowlState(cmd.bowl_id);
  const errors = validateCaptureWeight(
    cmd.meta.initiated_by,
    session,
    bowl,
    cmd.weight,
    cmd.is_manual_override ?? false,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'CaptureWeight',
      command_payload: { bowl_id: cmd.bowl_id, weight: cmd.weight },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'CaptureWeight',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'weight_captured',
    session!.current_status,
    {
      bowl_id: cmd.bowl_id,
      weight: cmd.weight,
      unit: cmd.unit,
      capture_method: cmd.capture_method,
      is_manual_override: cmd.is_manual_override,
    },
  );
}

export async function executeRecordLineItem(
  cmd: RecordLineItemCommand,
): Promise<CommandResult<unknown>> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const bowl = await fetchBowlState(cmd.bowl_id);
  const errors = validateRecordLineItem(
    cmd.meta.initiated_by,
    session,
    bowl,
    cmd.product_id,
    cmd.quantity,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'RecordLineItem',
      command_payload: { bowl_id: cmd.bowl_id, product_id: cmd.product_id, quantity: cmd.quantity },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'RecordLineItem',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'line_item_recorded',
    session!.current_status,
    { bowl_id: cmd.bowl_id, product_id: cmd.product_id, quantity: cmd.quantity, unit: cmd.unit },
  );
}

export async function executeRemoveLineItem(
  cmd: RemoveLineItemCommand,
): Promise<CommandResult<unknown>> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const bowl = await fetchBowlState(cmd.bowl_id);
  const lineExists = await checkLineExists(cmd.line_id);
  const errors = validateRemoveLineItem(cmd.meta.initiated_by, session, bowl, lineExists);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'RemoveLineItem',
      command_payload: { bowl_id: cmd.bowl_id, line_id: cmd.line_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'RemoveLineItem',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'line_item_removed',
    session!.current_status,
    { bowl_id: cmd.bowl_id, line_id: cmd.line_id },
  );
}

export async function executeSealBowl(
  cmd: SealBowlCommand,
): Promise<CommandResult> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const bowl = await fetchBowlState(cmd.bowl_id);
  const errors = validateSealBowl(cmd.meta.initiated_by, session, bowl);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'SealBowl',
      command_payload: { bowl_id: cmd.bowl_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'SealBowl',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'bowl_sealed',
    session!.current_status,
    { bowl_id: cmd.bowl_id },
  );
}

export async function executeCaptureReweigh(
  cmd: CaptureReweighCommand,
): Promise<CommandResult> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const bowl = await fetchBowlState(cmd.bowl_id);
  const errors = validateCaptureReweigh(cmd.meta.initiated_by, session, bowl, cmd.weight);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'CaptureReweigh',
      command_payload: { bowl_id: cmd.bowl_id, weight: cmd.weight },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'CaptureReweigh',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'reweigh_captured',
    session!.current_status,
    { bowl_id: cmd.bowl_id, weight: cmd.weight, unit: cmd.unit },
  );
}

export async function executeCompleteSession(
  cmd: CompleteSessionCommand,
): Promise<CommandResult> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const bowlsReady = await allBowlsTerminal(cmd.mix_session_id);
  const errors = validateCompleteSession(cmd.meta.initiated_by, session, bowlsReady);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'CompleteSession',
      command_payload: { mix_session_id: cmd.mix_session_id },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'CompleteSession',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'session_completed',
    session!.current_status,
  );
}

export async function executeMarkSessionUnresolved(
  cmd: MarkSessionUnresolvedCommand,
): Promise<CommandResult> {
  const session = await fetchSessionState(cmd.mix_session_id);
  const errors = validateMarkSessionUnresolved(cmd.meta.initiated_by, session);

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'MarkSessionUnresolved',
      command_payload: { mix_session_id: cmd.mix_session_id, reason: cmd.reason },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  return emitAndAudit(
    'MarkSessionUnresolved',
    cmd.meta,
    cmd.organization_id,
    cmd.mix_session_id,
    'session_marked_unresolved',
    session!.current_status,
    { reason: cmd.reason },
  );
}
