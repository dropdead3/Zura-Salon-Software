// ============================================================
// Capability Anomaly Recorder
// ----------------------------------------------------------------
// Lightweight wrapper around the `record_ai_anomaly` RPC. Edge
// functions call this when they detect a security signal
// (rate-limit hit, repeated denial, kill-switch attempt, etc).
// Failures here are swallowed — anomaly logging must never break
// the request path.
// ============================================================

// deno-lint-ignore-file no-explicit-any

export type AnomalyType =
  | 'rate_limit_hit'
  | 'repeated_denials'
  | 'kill_switch_attempt'
  | 'permission_denied_burst'
  | 'high_risk_burst'
  | 'invalid_param_burst';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export async function recordAnomaly(
  supabase: any,
  args: {
    organizationId: string;
    userId: string;
    type: AnomalyType;
    capabilityId?: string | null;
    severity?: AnomalySeverity;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.rpc('record_ai_anomaly', {
      p_org: args.organizationId,
      p_user: args.userId,
      p_type: args.type,
      p_capability: args.capabilityId ?? null,
      p_severity: args.severity ?? 'medium',
      p_details: args.details ?? {},
    });
  } catch (e) {
    console.warn('[anomaly] record failed (swallowed):', e);
  }
}

/**
 * Counts recent denied / failed audit rows for a user and emits an
 * anomaly if the threshold is crossed within a short window.
 */
export async function checkRepeatedDenialsBurst(
  supabase: any,
  organizationId: string,
  userId: string,
): Promise<void> {
  const sinceISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('ai_action_audit')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .in('status', ['denied', 'failed'])
    .gte('created_at', sinceISO);

  if ((count ?? 0) >= 5) {
    await recordAnomaly(supabase, {
      organizationId,
      userId,
      type: 'repeated_denials',
      severity: 'high',
      details: { window: '5m', count: count ?? 0 },
    });
  }
}
