/**
 * Command + Validation Layer — Shared Types
 *
 * All backroom commands carry a CommandMeta and return a CommandResult.
 * Validators return ValidationError[] (pure, no DB calls).
 * logCommandAudit() persists every command attempt to command_audit_log.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Command Meta ────────────────────────────────────

export type CommandSource = 'ui' | 'system' | 'offline_sync' | 'background_job';

export interface CommandMeta {
  initiated_by: string;
  initiated_at: string;
  idempotency_key: string;
  source: CommandSource;
  device_id?: string;
  station_id?: string;
}

// ─── Validation ──────────────────────────────────────

export interface ValidationError {
  code: string;
  field?: string;
  message: string;
}

// ─── Command Result ──────────────────────────────────

export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  idempotency_key: string;
  audited: boolean;
}

// ─── Audit Outcome ───────────────────────────────────

export type AuditOutcome = 'executed' | 'rejected' | 'duplicate';

// ─── Helpers ─────────────────────────────────────────

/**
 * Build a CommandMeta from the current auth context.
 * Convenience for UI hooks.
 */
export async function buildCommandMeta(
  source: CommandSource = 'ui',
  overrides?: Partial<CommandMeta>,
): Promise<CommandMeta> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('User not authenticated');

  return {
    initiated_by: userId,
    initiated_at: new Date().toISOString(),
    idempotency_key: crypto.randomUUID(),
    source,
    ...overrides,
  };
}

/**
 * Build a rejected CommandResult from validation errors.
 */
export function rejected<T = void>(
  idempotencyKey: string,
  errors: ValidationError[],
): CommandResult<T> {
  return { success: false, errors, idempotency_key: idempotencyKey, audited: true };
}

/**
 * Build a successful CommandResult.
 */
export function succeeded<T = void>(
  idempotencyKey: string,
  data?: T,
): CommandResult<T> {
  return { success: true, data, idempotency_key: idempotencyKey, audited: true };
}

// ─── Audit Logging ───────────────────────────────────

/**
 * Persist a command execution attempt to command_audit_log.
 * Fire-and-forget — audit failures should not block command execution.
 */
export async function logCommandAudit(params: {
  organization_id: string;
  command_name: string;
  command_payload: Record<string, unknown>;
  meta: CommandMeta;
  outcome: AuditOutcome;
  validation_errors?: ValidationError[];
  result_entity_type?: string;
  result_entity_id?: string;
}): Promise<void> {
  try {
    await supabase.from('command_audit_log' as any).insert({
      organization_id: params.organization_id,
      command_name: params.command_name,
      command_payload: params.command_payload,
      idempotency_key: params.meta.idempotency_key,
      initiated_by: params.meta.initiated_by,
      initiated_at: params.meta.initiated_at,
      outcome: params.outcome,
      validation_errors: params.validation_errors?.length
        ? params.validation_errors
        : null,
      result_entity_type: params.result_entity_type ?? null,
      result_entity_id: params.result_entity_id ?? null,
      source: params.meta.source,
    } as any);
  } catch (err) {
    console.error('[CommandAudit] Failed to log audit entry:', err);
  }
}
