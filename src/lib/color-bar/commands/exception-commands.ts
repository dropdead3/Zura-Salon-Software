/**
 * Exception Commands — Typed command objects + handlers.
 */

import type { CommandMeta, CommandResult } from './types';
import { logCommandAudit, rejected, succeeded } from './types';
import { resolveException } from '../services/exception-service';
import { validateResolveException } from './exception-validators';
import { supabase } from '@/integrations/supabase/client';

// ─── Command Definitions ─────────────────────────────

export interface ResolveExceptionCommand {
  meta: CommandMeta;
  organization_id: string;
  exception_id: string;
  action: 'acknowledged' | 'resolved' | 'dismissed';
  notes?: string;
}

// ─── State Fetchers ──────────────────────────────────

async function fetchExceptionState(exceptionId: string): Promise<{ exists: boolean; status: string | null }> {
  const { data } = await supabase
    .from('backroom_exceptions' as any)
    .select('id, status')
    .eq('id', exceptionId)
    .single();

  if (!data) return { exists: false, status: null };
  return { exists: true, status: (data as any).status };
}

// ─── Command Handler ─────────────────────────────────

export async function executeResolveException(
  cmd: ResolveExceptionCommand,
): Promise<CommandResult> {
  const state = await fetchExceptionState(cmd.exception_id);
  const errors = validateResolveException(
    cmd.meta.initiated_by,
    state.exists,
    state.status,
    cmd.action,
  );

  if (errors.length > 0) {
    await logCommandAudit({
      organization_id: cmd.organization_id,
      command_name: 'ResolveException',
      command_payload: { exception_id: cmd.exception_id, action: cmd.action },
      meta: cmd.meta,
      outcome: 'rejected',
      validation_errors: errors,
    });
    return rejected(cmd.meta.idempotency_key, errors);
  }

  await resolveException({
    exceptionId: cmd.exception_id,
    action: cmd.action,
    notes: cmd.notes,
  });

  await logCommandAudit({
    organization_id: cmd.organization_id,
    command_name: 'ResolveException',
    command_payload: { exception_id: cmd.exception_id, action: cmd.action },
    meta: cmd.meta,
    outcome: 'executed',
    result_entity_type: 'backroom_exception',
    result_entity_id: cmd.exception_id,
  });

  return succeeded(cmd.meta.idempotency_key);
}
