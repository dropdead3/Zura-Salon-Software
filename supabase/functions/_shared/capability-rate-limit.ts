// ============================================================
// Capability Rate Limiting
// ----------------------------------------------------------------
// Sliding-window counters stored in `ai_action_rate_limits`.
// We bucket by minute so two windows are checked: 1-minute burst
// and 60-minute sustained. Service-role only.
// ============================================================

// deno-lint-ignore-file no-explicit-any

export type RateBucket = 'propose' | 'execute';

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
}

const DEFAULTS: Record<RateBucket, RateLimitConfig> = {
  propose: { perMinute: 10, perHour: 120 },
  execute: { perMinute: 6, perHour: 60 },
};

function minuteWindow(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

/**
 * Atomically increments the per-minute counter and checks both windows.
 * Throws { status:429, message } if either limit is exceeded.
 */
export async function enforceRateLimit(
  supabase: any,
  organizationId: string,
  userId: string,
  bucket: RateBucket,
  config: RateLimitConfig = DEFAULTS[bucket],
): Promise<void> {
  const window_start = minuteWindow();

  // Atomic increment via SECURITY DEFINER RPC. Returns the new count.
  const { data: incremented, error: incErr } = await supabase.rpc('increment_ai_rate_limit', {
    p_org: organizationId,
    p_user: userId,
    p_bucket: bucket,
    p_window: window_start,
  });

  if (incErr) {
    console.warn('[rate-limit] increment RPC failed — failing open:', incErr);
    return;
  }

  const perMinuteCount = typeof incremented === 'number' ? incremented : 1;

  if (perMinuteCount > config.perMinute) {
    throw {
      status: 429,
      message: `Too many ${bucket} requests. Please wait a moment and try again.`,
    };
  }

  // Per-hour aggregate.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: hourRows } = await supabase
    .from('ai_action_rate_limits')
    .select('count')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('bucket', bucket)
    .gte('window_start', hourAgo);

  const hourCount = (hourRows || []).reduce((s: number, r: any) => s + (r.count || 0), 0);
  if (hourCount > config.perHour) {
    throw {
      status: 429,
      message: `Hourly ${bucket} limit reached. Try again later.`,
    };
  }
}

/**
 * Returns true if the capability is killed for the given org.
 */
export async function isCapabilityKilled(
  supabase: any,
  organizationId: string,
  capabilityId: string,
): Promise<{ killed: boolean; reason?: string }> {
  const { data } = await supabase
    .from('ai_capability_kill_switches')
    .select('disabled, reason')
    .eq('organization_id', organizationId)
    .eq('capability_id', capabilityId)
    .maybeSingle();
  if (data?.disabled) return { killed: true, reason: data.reason ?? undefined };
  return { killed: false };
}
