/**
 * ExceptionService — Sole owner of backroom_exceptions writes.
 *
 * Creates, resolves, and manages exception queue items.
 * Does not recalculate session or inventory truth.
 */

import { supabase } from '@/integrations/supabase/client';

export type ExceptionSeverity = 'info' | 'warning' | 'critical';
export type ExceptionStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface CreateExceptionParams {
  organization_id: string;
  location_id?: string | null;
  exception_type: string;
  severity: ExceptionSeverity;
  title: string;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  staff_user_id?: string | null;
  metric_value?: number | null;
  threshold_value?: number | null;
}

export interface ResolveExceptionParams {
  exceptionId: string;
  action: 'acknowledged' | 'resolved' | 'dismissed';
  notes?: string;
}

/**
 * Create a new exception in the backroom_exceptions queue.
 */
export async function createException(params: CreateExceptionParams): Promise<string> {
  const { data, error } = await supabase
    .from('backroom_exceptions' as any)
    .insert({
      organization_id: params.organization_id,
      location_id: params.location_id ?? null,
      exception_type: params.exception_type,
      severity: params.severity,
      title: params.title,
      description: params.description ?? null,
      reference_type: params.reference_type ?? null,
      reference_id: params.reference_id ?? null,
      staff_user_id: params.staff_user_id ?? null,
      metric_value: params.metric_value ?? null,
      threshold_value: params.threshold_value ?? null,
      status: 'open',
    } as any)
    .select('id')
    .single();

  if (error) throw error;
  return (data as any).id;
}

/**
 * Resolve, acknowledge, or dismiss an exception.
 */
export async function resolveException(params: ResolveExceptionParams): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { error } = await supabase
    .from('backroom_exceptions' as any)
    .update({
      status: params.action,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolved_notes: params.notes ?? null,
    } as any)
    .eq('id', params.exceptionId);

  if (error) throw error;
}
